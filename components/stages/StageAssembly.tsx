"use client";
import React, { useState, useRef, useCallback } from "react";
import { toPng } from 'html-to-image';
import { PhotoData, LayoutConfig } from "@/src/types/photobooth"; 
import { 
  Download, 
  RotateCcw, 
  Move, 
  Check, 
  Palette, 
  Calendar,
  Loader2,
  Wand2,
  ArrowLeft,
  Upload // Ganti Icon Plus jadi Upload
} from "lucide-react";

// --- DATA THEMES ---
const THEMES = [
  { 
    id: "pink-dots", 
    name: "Pink Dots", 
    backgroundImage: "radial-gradient(circle, #fbcfe8 10%, transparent 11%)", 
    backgroundColor: "#fdf2f8", 
    backgroundSize: "10px 10px" 
  },
  { 
    id: "solid-pink", 
    name: "Soft Pink", 
    backgroundImage: "none", 
    backgroundColor: "#fbcfe8", 
    backgroundSize: "cover" 
  },
  { 
    id: "solid-blue", 
    name: "Soft Blue", 
    backgroundImage: "none", 
    backgroundColor: "#bae6fd", 
    backgroundSize: "cover" 
  },
  { 
    id: "solid-purple", 
    name: "Soft Purple", 
    backgroundImage: "none", 
    backgroundColor: "#e9d5ff", 
    backgroundSize: "cover" 
  },
  { 
    id: "solid-green", 
    name: "Soft Green", 
    backgroundImage: "none", 
    backgroundColor: "#bbf7d0", 
    backgroundSize: "cover" 
  },
  { 
    id: "checkered-black", 
    name: "Checkered", 
    backgroundImage: "repeating-linear-gradient(45deg, #333 25%, transparent 25%, transparent 75%, #333 75%, #333), repeating-linear-gradient(45deg, #333 25%, #fff 25%, #fff 75%, #333 75%, #333)", 
    backgroundColor: "#ffffff",
    backgroundSize: "20px 20px" 
  },
  { 
    id: "grid-white", 
    name: "Grid", 
    backgroundImage: "linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)", 
    backgroundColor: "#ffffff",
    backgroundSize: "20px 20px"
  },
  { 
    id: "dark-red", 
    name: "Velvet", 
    backgroundImage: "none", 
    backgroundColor: "#7f1d1d", 
    backgroundSize: "cover" 
  },
  { 
    id: "black", 
    name: "Classic Black", 
    backgroundImage: "none", 
    backgroundColor: "#000000", 
    backgroundSize: "cover" 
  },
];

// --- DATA FILTERS ---
const FILTERS = [
  { name: 'Normal', value: 'none', color: '#ffffff' },
  { name: 'B&W', value: 'grayscale(100%)', color: '#555555' },
  { name: 'Sepia', value: 'sepia(100%)', color: '#704214' },
  { name: 'Vintage', value: 'sepia(50%) contrast(120%) brightness(90%)', color: '#d4b996' },
  { name: 'Cool', value: 'hue-rotate(180deg) opacity(0.9)', color: '#a5f3fc' },
];

interface StageAssemblyProps {
  layout: LayoutConfig;
  photos: PhotoData[]; 
  onRestart: () => void;
  onBack: () => void;
}

export default function StageAssembly({ layout, photos, onRestart, onBack }: StageAssemblyProps) {
  
  const [finalOrder, setFinalOrder] = useState<PhotoData[]>(photos);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [selectedFilter, setSelectedFilter] = useState('none'); 
  const [showDate, setShowDate] = useState(false);
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const stripRef = useRef<HTMLDivElement>(null);

  // Layout Logic
  const isGrid = layout.type === 'grid'; 
  const stripWidth = isGrid ? '320px' : '240px'; 
  const containerPadding = '16px'; 
  const gapSize = 'gap-2'; 

  // --- LOGIC: SWAP POSISI ---
  const handlePhotoClick = (index: number) => {
    if (swappingIndex === null) {
      setSwappingIndex(index);
    } else if (swappingIndex === index) {
      setSwappingIndex(null);
    } else {
      const newOrder = [...finalOrder];
      [newOrder[swappingIndex], newOrder[index]] = [newOrder[index], newOrder[swappingIndex]];
      setFinalOrder(newOrder);
      setSwappingIndex(null);
    }
  };

  // --- LOGIC: APPLY FILTER ---
  const handleApplyFilter = (filterValue: string) => {
    setSelectedFilter(filterValue);
    setFinalOrder(prev => prev.map(p => ({
        ...p,
        filter: filterValue
    })));
  };

  // --- LOGIC: CUSTOM BACKGROUND UPLOAD (BARU) ---
  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setSelectedTheme({
                    id: "custom-upload",
                    name: "Custom Image",
                    // Set hasil upload sebagai background image URL
                    backgroundImage: `url('${event.target.result}')`,
                    backgroundColor: "transparent",
                    backgroundSize: "cover" // Cover agar memenuhi kertas
                });
            }
        };
        reader.readAsDataURL(file);
    }
  };

  // --- LOGIC: DOWNLOAD ---
  const handleDownload = useCallback(async () => {
    if (!stripRef.current) return;
    setIsDownloading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const dataUrl = await toPng(stripRef.current, {
        cacheBust: true,
        pixelRatio: 3, 
        style: {
            transform: 'none', 
            backgroundColor: selectedTheme.backgroundColor,
            backgroundImage: selectedTheme.backgroundImage,
            backgroundSize: selectedTheme.backgroundSize,
            backgroundRepeat: 'repeat', // Default repeat untuk pola
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
        }
      });

      const link = document.createElement("a");
      link.download = `photobooth-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [stripRef, selectedTheme]); 

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px] bg-pink-50/50 rounded-3xl overflow-hidden">
      
      {/* --- KIRI: PREVIEW STRIP --- */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-100/50 overflow-y-auto">
        
        <div 
           id="print-area"
           ref={stripRef}
           className="relative shadow-2xl transition-all duration-300 transform origin-top"
           style={{
             width: stripWidth, 
             padding: containerPadding, 
             backgroundColor: selectedTheme.backgroundColor,
             backgroundImage: selectedTheme.backgroundImage,
             // Jika custom upload, kita paksa 'cover', jika pola '10px' dll
             backgroundSize: selectedTheme.id === 'custom-upload' ? 'cover' : selectedTheme.backgroundSize,
             backgroundRepeat: selectedTheme.id === 'custom-upload' ? 'no-repeat' : 'repeat',
             backgroundPosition: 'center',
             display: 'flex',
             flexDirection: 'column',
             minHeight: 'auto' 
           }}
        >

            <div className={`${isGrid ? 'grid grid-cols-2' : 'flex flex-col'} ${gapSize}`}>
               {finalOrder.map((photo, index) => (
                  <div 
                    key={photo.id} 
                    onClick={() => handlePhotoClick(index)}
                    className={`
                        relative aspect-[4/3] w-full overflow-hidden border-2 shadow-sm cursor-pointer transition-all duration-200
                        ${swappingIndex === index ? 'border-purple-500 scale-105 z-10 ring-2 ring-purple-200' : 'border-white hover:border-gray-300'}
                    `}
                  >
                      <img 
                        src={photo.aiSrc || photo.src} 
                        className="w-full h-full object-cover pointer-events-none transition-all duration-300" 
                        alt={`Slot ${index}`}
                        crossOrigin="anonymous" 
                        style={{ filter: photo.filter || selectedFilter || 'none' }} 
                      />

                      {swappingIndex === index && (
                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                            <Move className="text-white drop-shadow-md animate-pulse" size={32} />
                        </div>
                      )}
                  </div>
               ))}
            </div>

            {showDate && (
                <div className="mt-4 text-center">
                    <p className="text-[10px] font-mono text-gray-700 font-bold tracking-widest bg-white/60 inline-block px-2 py-0.5 rounded">
                        {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                    </p>
                </div>
            )}

        </div>
      </div>

      {/* --- KANAN: CONTROLS --- */}
      <div className="w-full md:w-96 bg-white p-6 flex flex-col border-l border-pink-100 z-10 shadow-xl overflow-y-auto">
          
          <div className="mb-6">
             <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
                <Palette className="text-pink-500" size={20}/> Customize Layout
             </h3>
             <p className="text-xs text-gray-400">Personalize your photostrip.</p>
          </div>

          {/* 1. THEMES GRID */}
          <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Templates</label>
              <div className="grid grid-cols-5 gap-3">
                  {/* PRESET THEMES */}
                  {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme)}
                        className={`
                            w-12 h-12 rounded-full shadow-sm border-2 transition-all hover:scale-110 relative overflow-hidden
                            ${selectedTheme.id === theme.id ? 'border-pink-500 ring-2 ring-pink-200 scale-110' : 'border-gray-200'}
                        `}
                        style={{ 
                            backgroundColor: theme.backgroundColor,
                            backgroundImage: theme.backgroundImage,
                            backgroundSize: theme.backgroundSize,
                            backgroundRepeat: 'repeat',
                            backgroundPosition: 'center'
                        }}
                        title={theme.name}
                      >
                         {selectedTheme.id === theme.id && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                <Check size={16} className="text-white"/>
                             </div>
                         )}
                      </button>
                  ))}

                  {/* TOMBOL CUSTOM UPLOAD */}
                  <div 
                    className={`
                        relative w-12 h-12 rounded-full shadow-sm border-2 transition-all hover:scale-110 overflow-hidden flex items-center justify-center bg-gray-50
                        ${selectedTheme.id === 'custom-upload' ? 'border-pink-500 ring-2 ring-pink-200 scale-110' : 'border-dashed border-gray-300 hover:border-purple-400'}
                    `}
                    title="Upload Custom Background"
                  >
                      {/* Input File Invisible */}
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={handleCustomBgUpload}
                      />
                      
                      {/* Tampilan jika Custom dipilih (tampilkan preview gambar) */}
                      {selectedTheme.id === 'custom-upload' ? (
                          <>
                             <div 
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: selectedTheme.backgroundImage }}
                             />
                             <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                                <Check size={16} className="text-white"/>
                             </div>
                          </>
                      ) : (
                          // Icon Upload jika belum dipilih
                          <Upload size={20} className="text-gray-400"/>
                      )}
                  </div>

              </div>
          </div>

          {/* 2. FILTERS */}
          <div className="mb-6">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                 Filters <Wand2 size={12}/>
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {FILTERS.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => handleApplyFilter(f.value)}
                        className={`
                            px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all whitespace-nowrap
                            ${selectedFilter === f.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'}
                        `}
                      >
                          {f.name}
                      </button>
                  ))}
              </div>
          </div>

          {/* 3. OPTIONS */}
          <div className="mb-8 space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Options</label>
              
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${showDate ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300'}`}>
                      {showDate && <Check size={12}/>}
                  </div>
                  <input type="checkbox" className="hidden" checked={showDate} onChange={() => setShowDate(!showDate)} />
                  <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400"/> Add Date & Time
                  </div>
              </label>
          </div>

          {/* 4. ACTIONS */}
          <div className="mt-auto space-y-3 pt-6 border-t border-gray-100">
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full font-bold shadow-lg hover:shadow-pink-500/30 hover:scale-[1.02] transition flex items-center justify-center gap-2"
              >
                  {isDownloading ? (
                      <><Loader2 className="animate-spin" size={20}/> SAVING...</>
                  ) : (
                      <><Download size={20}/> DOWNLOAD PHOTOSTRIP</>
                  )}
              </button>
              
              <button 
                onClick={onBack}
                className="w-full py-3 bg-white border-2 border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 text-sm font-bold flex items-center justify-center gap-2 rounded-full transition"
              >
                  <ArrowLeft size={16}/> Back to Edit
              </button>

              <button 
                onClick={onRestart}
                className="w-full py-3 text-gray-400 hover:text-gray-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 rounded-full transition"
              >
                  <RotateCcw size={16}/> Start New Session
              </button>
          </div>

      </div>
    </div>
  );
}