"use client";
import React, { useState } from "react";
import { 
  Camera, 
  LayoutTemplate, 
  Image as ImageIcon, 
} from "lucide-react";
import { PhotoData, LayoutConfig, LAYOUTS } from "@/src/types/photobooth";

import StageCamera from "@/components/stages/StageCamera"; 
import StageAIStudio from "@/components/stages/StageAIStudio";
import StageAssembly from "@/components/stages/StageAssembly"; 

enum AppStage {
  MODE_SELECT = 0,
  LAYOUT_SELECT = 1,
  CAMERA_CAPTURE = 2,
  AI_STUDIO = 3,
  ASSEMBLY = 4
}

// Tipe data untuk menyimpan sesi AI
export interface AISessionData {
  userTokens: number;
  idolPhoto: string | null;
  userPrompt: string;
  bgPrompt: string;
  generatedAiCache: (string | null)[]; // Simpan hasil generate resolusi tinggi
  aiPhotos: (string | null)[]; // Simpan hasil crop/view
}

export default function Home() {
  const [stage, setStage] = useState<AppStage>(AppStage.MODE_SELECT);
  
  const [selectedMode, setSelectedMode] = useState<'classic' | 'newspaper' | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<LayoutConfig | null>(null);
  
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoData[]>([]);
  const [finalPhotos, setFinalPhotos] = useState<PhotoData[]>([]);

  // BARU: State untuk menyimpan data sesi AI agar tidak hilang saat Back
  const [aiSessionData, setAiSessionData] = useState<AISessionData>({
      userTokens: 0,
      idolPhoto: null,
      userPrompt: "",
      bgPrompt: "",
      generatedAiCache: [], 
      aiPhotos: []
  });

  const handleRestart = () => {
    if (confirm("Start new session? Current progress will be lost.")) {
      setStage(AppStage.MODE_SELECT);
      setSelectedMode(null);
      setSelectedLayout(null);
      setCapturedPhotos([]);
      setFinalPhotos([]);
      // Reset AI Session juga
      setAiSessionData({
          userTokens: 0,
          idolPhoto: null,
          userPrompt: "",
          bgPrompt: "",
          generatedAiCache: [],
          aiPhotos: []
      });
    }
  };

  const renderContent = () => {
    switch (stage) {
      case AppStage.MODE_SELECT:
        return (
          <div className="flex flex-col md:flex-row gap-6 items-center justify-center h-full p-10 animate-in fade-in zoom-in">
            <button 
                onClick={() => { setSelectedMode('classic'); setStage(AppStage.LAYOUT_SELECT); }}
                className="group relative w-64 h-80 bg-white rounded-3xl border-4 border-gray-100 hover:border-pink-400 hover:shadow-2xl transition-all flex flex-col items-center justify-center gap-4 overflow-hidden"
            >
                <div className="p-4 bg-pink-100 rounded-full group-hover:scale-110 transition"><Camera size={40} className="text-pink-500"/></div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest">Classic</h3>
                <p className="text-xs text-center text-gray-400 px-6">Original photobooth experience with AI enhancement.</p>
            </button>
            <button disabled className="relative w-64 h-80 bg-gray-50 rounded-3xl border-4 border-gray-100 opacity-60 cursor-not-allowed flex flex-col items-center justify-center gap-4 grayscale">
                <div className="absolute top-4 right-4 bg-gray-200 text-gray-500 text-[10px] font-bold px-2 py-1 rounded">COMING SOON</div>
                <div className="p-4 bg-gray-200 rounded-full"><ImageIcon size={40} className="text-gray-400"/></div>
                <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">Newspaper</h3>
                <p className="text-xs text-center text-gray-400 px-6">Vintage aesthetic prints.</p>
            </button>
          </div>
        );

      case AppStage.LAYOUT_SELECT:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 animate-in slide-in-from-right">
             <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
                    <LayoutTemplate/> Select Layout
                </h2>
                <p className="text-gray-400 text-sm">Choose your grid style</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {LAYOUTS.map((layout) => (
                    <button 
                        key={layout.id}
                        onClick={() => { setSelectedLayout(layout); setStage(AppStage.CAMERA_CAPTURE); }}
                        className="group flex flex-col items-center gap-3"
                    >
                        <div className="w-40 h-56 bg-white border-4 border-gray-200 rounded-2xl group-hover:border-purple-500 group-hover:shadow-xl transition-all p-3 flex flex-col gap-2 justify-center items-center">
                            <div className={`w-full h-full bg-gray-50 rounded-lg overflow-hidden gap-1 ${layout.type === 'grid' ? 'grid grid-cols-2' : 'flex flex-col'}`}>
                                {[...Array(layout.slots)].map((_,i) => (
                                    <div key={i} className="bg-purple-100 w-full h-full rounded-sm border border-purple-200"></div>
                                ))}
                            </div>
                        </div>
                        <span className="font-bold text-gray-600 group-hover:text-purple-600">{layout.name}</span>
                    </button>
                ))}
             </div>
             <button onClick={() => setStage(AppStage.MODE_SELECT)} className="mt-10 text-gray-400 hover:text-gray-600 text-sm font-bold">Back</button>
          </div>
        );

      case AppStage.CAMERA_CAPTURE:
        return (
            <StageCamera 
                layout={selectedLayout!} 
                initialPhotos={capturedPhotos} 
                onComplete={(photos) => {
                    setCapturedPhotos(photos);
                    setFinalPhotos(photos);
                    setStage(AppStage.AI_STUDIO);
                }}
                onBack={() => setStage(AppStage.LAYOUT_SELECT)}
            />
        );

      case AppStage.AI_STUDIO:
        if (!selectedLayout) return null;
        return (
            <StageAIStudio 
                layout={selectedLayout}
                originalPhotos={capturedPhotos} 
                enableSelection={true} 
                
                // BARU: Pass data sesi yang tersimpan
                initialSessionData={aiSessionData}
                
                // BARU: Fungsi untuk update data sesi saat ada perubahan/pindah
                onUpdateSession={(newData) => setAiSessionData(newData)}

                onComplete={(aiResults) => {
                    setFinalPhotos(aiResults); 
                    setStage(AppStage.ASSEMBLY); 
                }}
                onBack={() => setStage(AppStage.CAMERA_CAPTURE)}
            />
        );
 
      case AppStage.ASSEMBLY:
        if (!selectedLayout) return null;
        return (
            <StageAssembly
                layout={selectedLayout}
                photos={finalPhotos}
                onRestart={handleRestart}
                onBack={() => setStage(AppStage.AI_STUDIO)} 
            />
        );
        
      default: return null;
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans text-gray-800 selection:bg-pink-200">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-40 border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Camera size={24} className="text-pink-500" /> Ceritanya ini Photobox
        </h1>
        <div className="flex gap-2">
            {[0,1,2,3,4].map(s => (
                <div key={s} className={`h-2 rounded-full transition-all duration-500 ${stage === s ? 'bg-purple-600 w-8' : (stage > s ? 'bg-pink-400 w-2' : 'bg-gray-200 w-2')}`} />
            ))}
        </div>
      </nav>

      <div className="pt-24 pb-10 px-4 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-6xl bg-white rounded-[40px] shadow-2xl border-4 border-white ring-1 ring-gray-100 min-h-[600px] overflow-hidden relative transition-all">
            {renderContent()}
        </div>
      </div>
    </main>
  );
}