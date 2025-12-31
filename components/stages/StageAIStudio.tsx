"use client";
import React, { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop"; 
import getCroppedImg from "@/src/utils/cropImage";
import { PhotoData, LayoutConfig } from "@/src/types/photobooth"; 
// Import interface AISessionData (atau definisikan ulang jika Anda tidak export dari page.tsx)
import { AISessionData } from "@/app/page"; // Pastikan path ini benar sesuai file page.tsx Anda
import { 
  Sparkles, Wand2, ArrowRight, Upload, UserPlus, MapPin, Loader2, ArrowLeft,
  CheckCircle2, Circle, MousePointerClick, SkipForward, SlidersHorizontal, 
  X, RotateCcw, Check, ZoomIn, Undo2, Coins, Lock, Ticket, Plus
} from "lucide-react";

// ... (TOKEN_COSTS & INITIAL_VALID_CODES TETAP SAMA) ...
const TOKEN_COSTS = {
    BASE_GENERATION: 5, 
    PARTNER: 15,       
    BACKGROUND: 10,    
    STYLE: 10,         
    ENHANCE: 2         
};

const getInitialCodes = () => {
  try {
    // Panggil dengan nama baru NEXT_PUBLIC_...
    const envCodes = process.env.NEXT_PUBLIC_VALID_CODES;
    
    if (!envCodes) return [];
    return JSON.parse(envCodes);
  } catch (error) {
    console.error("Gagal parsing kode:", error);
    return [];
  }
};

// Gunakan function tersebut
const INITIAL_VALID_CODES = getInitialCodes();

interface StageAIStudioProps {
  layout: LayoutConfig;
  originalPhotos: PhotoData[];
  enableSelection?: boolean;
  onComplete: (aiPhotos: PhotoData[]) => void;
  onBack: () => void;
  // PROPS BARU UNTUK PERSISTENCE
  initialSessionData: AISessionData;
  onUpdateSession: (data: AISessionData) => void;
}

interface VoucherCode {
  code: string;
  value: number;
  active: boolean;
}

export default function StageAIStudio({ 
  layout, 
  originalPhotos, 
  enableSelection = true, 
  onComplete, 
  onBack,
  initialSessionData,
  onUpdateSession
}: StageAIStudioProps) {

  // --- INISIALISASI STATE DARI initialSessionData ---
  const [userTokens, setUserTokens] = useState(initialSessionData.userTokens); 
  const [idolPhoto, setIdolPhoto] = useState<string | null>(initialSessionData.idolPhoto);
  const [userPrompt, setUserPrompt] = useState(initialSessionData.userPrompt);
  const [bgPrompt, setBgPrompt] = useState(initialSessionData.bgPrompt);
  
  // Cache dan AI Photos juga di-restore dari props
  const [aiPhotos, setAiPhotos] = useState<(string | null)[]>(
      initialSessionData.aiPhotos.length > 0 ? initialSessionData.aiPhotos : Array(layout.slots).fill(null)
  );
  const [generatedAiCache, setGeneratedAiCache] = useState<(string | null)[]>(
      initialSessionData.generatedAiCache.length > 0 ? initialSessionData.generatedAiCache : Array(layout.slots).fill(null)
  );

  // --- STATE LOKAL (Tidak perlu disimpan di parent) ---
  const [validCodes, setValidCodes] = useState<VoucherCode[]>(INITIAL_VALID_CODES);
  const [showRedeemModal, setShowRedeemModal] = useState(userTokens === 0 && aiPhotos.every(p => p === null)); 
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<{type: 'success'|'error'|null, msg: string}>({type: null, msg: ""});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // State Cropper
  const [adjustingPhotoIndex, setAdjustingPhotoIndex] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Inisialisasi awal: Jika aiPhotos kosong, isi dengan original
  useEffect(() => {
    setAiPhotos(prev => {
        const initial = [...prev];
        originalPhotos.forEach((p, i) => {
            // Hanya isi jika null (belum ada AI result)
            if (initial[i] === null) initial[i] = p.src; 
        });
        return initial;
    });
  }, [originalPhotos]);

  // --- HELPER: SAVE SESSION ---
  // Fungsi ini dipanggil sebelum pindah halaman untuk menyimpan state ke Parent
  const saveSessionState = () => {
      onUpdateSession({
          userTokens,
          idolPhoto,
          userPrompt,
          bgPrompt,
          generatedAiCache,
          aiPhotos
      });
  };

  // --- MODIFIED HANDLERS ---
  // Modifikasi onBack agar menyimpan state dulu
  const handleBack = () => {
      saveSessionState();
      onBack();
  };

  // Modifikasi onNext agar menyimpan state dulu
  const handleNext = () => {
    saveSessionState();
    
    const finalData = originalPhotos.map((photo, index) => {
        const currentResult = aiPhotos[index];
        const isModified = currentResult !== photo.src;
        return { ...photo, aiSrc: isModified && currentResult ? currentResult : undefined, isAiGenerated: isModified };
    });
    onComplete(finalData);
  };

  // ... (SISA LOGIC REDEEM, COST, GENERATE, DLL - TETAP SAMA) ...
  // Copy logic handleRedeem, calculateTotalCost, handleGenerateAll, dll dari kode sebelumnya.
  // Pastikan function di atas menggunakan saveSessionState() jika diperlukan (biasanya hanya saat navigasi)

  const handleRedeem = () => {
      const codeToCheck = redeemInput.trim().toUpperCase();
      const foundIndex = validCodes.findIndex(c => c.code === codeToCheck);

      if (foundIndex !== -1) {
          const codeData = validCodes[foundIndex];
          if (codeData.active) {
              setUserTokens(prev => prev + codeData.value);
              setRedeemStatus({ type: 'success', msg: `Success! Added ${codeData.value} Tokens.` });
              const newCodes = [...validCodes];
              newCodes[foundIndex].active = false;
              setValidCodes(newCodes);
              setTimeout(() => {
                  setShowRedeemModal(false);
                  setRedeemStatus({ type: null, msg: "" });
                  setRedeemInput("");
              }, 1500);
          } else {
              setRedeemStatus({ type: 'error', msg: "This code has already been used." });
          }
      } else {
          setRedeemStatus({ type: 'error', msg: "Invalid code. Please check again." });
      }
  };

  const calculateTotalCost = () => {
      let cost = 0;
      if (selectedIds.length === 0) return 0;
      cost += TOKEN_COSTS.BASE_GENERATION;
      if (idolPhoto) cost += TOKEN_COSTS.PARTNER;
      if (bgPrompt) cost += TOKEN_COSTS.BACKGROUND;
      if (userPrompt) cost += TOKEN_COSTS.STYLE;
      return cost;
  };

  const currentCost = calculateTotalCost();
  const canAfford = userTokens >= currentCost;

  const onCropComplete = useCallback((area:any, pixels:any) => setCroppedAreaPixels(pixels), []);
  const closeAdjustModal = () => { setAdjustingPhotoIndex(null); setCrop({x:0,y:0}); setZoom(1); setRotation(0); };
  
  const handleSaveAdjustment = async () => {
    if (adjustingPhotoIndex === null || !croppedAreaPixels) return;
    const sourceImage = generatedAiCache[adjustingPhotoIndex] || originalPhotos[adjustingPhotoIndex].src;
    try {
      const croppedImage = await getCroppedImg(sourceImage, croppedAreaPixels, rotation);
      setAiPhotos(prev => { const n = [...prev]; n[adjustingPhotoIndex] = croppedImage; return n; });
      closeAdjustModal();
    } catch (e) { console.error(e); }
  };

  const handleRestoreOriginal = (index: number) => {
      setAiPhotos(prev => { const n = [...prev]; n[index] = originalPhotos[index].src; return n; });
      setGeneratedAiCache(prev => { const n = [...prev]; n[index] = null; return n; });
  };

  const toggleSelection = (id: string) => {
    if (isGenerating) return; 
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(p => p !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const handleEnhancePrompt = async () => {
    if (!userPrompt.trim()) return;
    if (userTokens < TOKEN_COSTS.ENHANCE) { alert("Not enough tokens!"); return; }
    setIsEnhancing(true);
    try {
      setUserTokens(prev => prev - TOKEN_COSTS.ENHANCE);
      const res = await fetch("/api/enhance", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: userPrompt }),
      });
      const data = await res.json();
      if (data.output) setUserPrompt(data.output);
    } catch (error) { console.error(error); } 
    finally { setIsEnhancing(false); }
  };

  const handleSkip = () => {
    // Saat skip, kita juga simpan session state, tapi mungkin tidak perlu di-reset
    saveSessionState();
    const skippedData = originalPhotos.map(photo => ({ ...photo, aiSrc: undefined, isAiGenerated: false }));
    onComplete(skippedData);
  };

  const handleGenerateAll = async () => {
    if (selectedIds.length === 0) { alert("Please select a photo."); return; }
    if (!canAfford) { setShowRedeemModal(true); return; }

    setUserTokens(prev => prev - currentCost);
    setIsGenerating(true);
    
    const currentResults = [...aiPhotos];
    originalPhotos.forEach((photo, index) => { if (selectedIds.includes(photo.id)) currentResults[index] = null; });
    setAiPhotos([...currentResults]); 

    for (let i = 0; i < originalPhotos.length; i++) {
        const photo = originalPhotos[i];
        if (!selectedIds.includes(photo.id)) continue; 
        try {
            const res = await fetch("/api/generate", {
                method: "POST",
                body: JSON.stringify({ userImage: photo.src, idolImage: idolPhoto, userPrompt: userPrompt, backgroundPrompt: bgPrompt }),
            });
            const data = await res.json();
            if (data.output) {
                const fullAiImage = `data:image/jpeg;base64,${data.output}`;
                setGeneratedAiCache(prev => { const n = [...prev]; n[i] = fullAiImage; return n; });
                currentResults[i] = fullAiImage;
            } else { currentResults[i] = photo.src; }
        } catch (error) { currentResults[i] = photo.src; }
        setAiPhotos([...currentResults]);
    }
    setIsGenerating(false); setSelectedIds([]); 
  };

  const isAllFilled = aiPhotos.every(p => p !== null);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px] bg-white rounded-3xl overflow-hidden relative border-4 border-white shadow-2xl">
      {/* ... (UI TETAP SAMA SEPERTI SEBELUMNYA, CUKUP COPY PASTE BAGIAN RETURN DI BAWAH INI) ... */}
      
      {/* (Copy UI Modal Redeem dari kode sebelumnya) */}
      {showRedeemModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-gray-100">
                <button onClick={() => setShowRedeemModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 transition"><X size={20}/></button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600 shadow-sm"><Ticket size={32} /></div>
                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-wide">Insert Code</h3>
                    <p className="text-gray-500 text-sm mt-2">Enter your voucher code to refill tokens.</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <input type="text" placeholder="GEN5-XXXX-XXXX" value={redeemInput} onChange={(e) => setRedeemInput(e.target.value.toUpperCase())} className="w-full text-center text-xl font-mono font-bold py-4 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none tracking-widest uppercase placeholder:text-gray-300 transition-all"/>
                        {redeemStatus.type && (<p className={`text-sm text-center mt-2 font-bold ${redeemStatus.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{redeemStatus.msg}</p>)}
                    </div>
                    <button onClick={handleRedeem} className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"><Check size={18}/> Redeem Tokens</button>
                </div>
            </div>
        </div>
      )}

      {/* (Copy UI Modal Cropper dari kode sebelumnya) */}
      {adjustingPhotoIndex !== null && aiPhotos[adjustingPhotoIndex] && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
             <div className="relative w-full max-w-4xl h-[80vh] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="relative flex-1">
                    <Cropper image={generatedAiCache[adjustingPhotoIndex] || originalPhotos[adjustingPhotoIndex].src} crop={crop} zoom={zoom} rotation={rotation} aspect={4/3} onCropChange={setCrop} onRotationChange={setRotation} onCropComplete={onCropComplete} onZoomChange={setZoom}/>
                </div>
                <div className="bg-gray-800 p-4 flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-white text-xs"><ZoomIn size={14}/> <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="accent-purple-500"/></div>
                        <div className="flex items-center gap-2 text-white text-xs"><RotateCcw size={14}/> <input type="range" min={0} max={360} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="accent-purple-500"/></div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={closeAdjustModal} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-bold hover:bg-gray-600">Cancel</button>
                        <button onClick={handleSaveAdjustment} className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-500">Apply</button>
                    </div>
                </div>
             </div>
         </div>
      )}

      {/* UI SIDEBAR & PREVIEW (Copy dari kode sebelumnya, ganti onClick 'onBack' dan 'handleNext' dengan 'handleBack' dan 'handleNext') */}
      <div className="w-full md:w-80 bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto z-10">
         {/* ... (Konten Sidebar Sama) ... */}
         {/* HEADER WALLET */}
         <div className="flex justify-between items-start border-b border-gray-200 pb-4">
            <div>
                <h3 className="text-m font-black text-purple-600 uppercase tracking-widest flex items-center gap-2 mb-1"><Wand2 size={16}/> AI Studio</h3>
                <h2 className="text-xs font-black text-red-500 lowercase tracking-widest flex items-center gap-2 mb-1"> notes: jomblo skip aja</h2>
                <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-2 text-yellow-700 bg-yellow-100 border border-yellow-200 px-3 py-1.5 rounded-full w-fit shadow-sm"><Coins size={14} className="text-yellow-600"/><span className="text-xs font-bold">{userTokens} Tokens</span></div>
                    <button onClick={() => setShowRedeemModal(true)} className="bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition shadow-sm" title="Add Token"><Plus size={14}/></button>
                </div>
            </div>
            <button onClick={handleSkip} className="text-xs font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-lg transition">Skip <SkipForward size={12} /></button>
         </div>

{/* INPUTS (Copy Paste) */}
          <div className="space-y-2">
             <div className="flex justify-between">
                <label className="text-xs font-bold text-gray-700">Partner (Optional)</label>
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">{TOKEN_COSTS.PARTNER} <Coins size={8}/></span>
             </div>
             
             {/* WRAPPER BARU: relative group untuk menampung input dan tombol delete */}
             <div className="relative group">
                 <label className={`h-16 w-full border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-all ${idolPhoto ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-purple-400 hover:bg-white'}`}>
                    {idolPhoto ? (
                        <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
                            <UserPlus size={16}/> Partner Added
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 text-xs gap-1">
                            <Upload size={16}/><span>Upload Photo</span>
                        </div>
                    )}
                    <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => { 
                           const f = e.target.files?.[0]; 
                           if(f) { 
                              const r = new FileReader(); 
                              r.onload=()=>setIdolPhoto(r.result as string); 
                              r.readAsDataURL(f); 
                              e.target.value = ""; // Reset value agar bisa upload ulang file yang sama
                           }
                        }} 
                    />
                 </label>

                 {/* TOMBOL DELETE (X) - Hanya muncul jika idolPhoto ada */}
                 {idolPhoto && (
                     <button 
                        onClick={(e) => {
                           e.preventDefault(); // Mencegah membuka file explorer saat diklik
                           setIdolPhoto(null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-all z-20 hover:scale-110"
                        title="Remove Partner"
                     >
                        <X size={12} />
                     </button>
                 )}
             </div>
          </div>

          <div className="space-y-4">
             <div>
                 <div className="flex justify-between mb-1"><label className="text-xs font-bold text-gray-700">Background (Optional)</label><span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">{TOKEN_COSTS.BACKGROUND} <Coins size={8}/></span></div>
                 <div className="relative"><MapPin size={14} className="absolute left-3 top-3 text-gray-400"/><input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-200 outline-none transition" placeholder="e.g. Snowy Tokyo, Beach..." value={bgPrompt} onChange={(e) => setBgPrompt(e.target.value)}/></div>
             </div>
             <div>
                 <div className="flex justify-between items-center mb-1"><div className="flex gap-2 items-center"><label className="text-xs font-bold text-gray-700">Style Prompt</label><span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">{TOKEN_COSTS.STYLE} <Coins size={8}/></span></div><button onClick={handleEnhancePrompt} disabled={isEnhancing || !userPrompt || userTokens < TOKEN_COSTS.ENHANCE} className="text-[10px] flex items-center gap-1 text-purple-500 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-bold bg-purple-50 px-2 py-0.5 rounded-full">{isEnhancing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}Enhance ({TOKEN_COSTS.ENHANCE} <Coins size={8}/>)</button></div>
                 <div className="relative"><textarea className="w-full p-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-200 outline-none resize-none h-24" placeholder="Describe pose, outfit..." value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)}/></div>
             </div>
          </div>

         {/* ACTION BUTTONS (GANTI onBack dengan handleBack) */}
         <div className="mt-auto pt-6 border-t border-gray-200">
             {selectedIds.length > 0 && !isGenerating && (<div className="flex justify-between items-center mb-2 text-xs font-bold text-gray-600"><span>Total Cost:</span><span className={`flex items-center gap-1 ${canAfford ? 'text-gray-900' : 'text-red-500'}`}>{currentCost} <Coins size={12}/></span></div>)}
             <button onClick={handleGenerateAll} disabled={isGenerating || selectedIds.length === 0} className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] ${isGenerating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : (!canAfford ? 'bg-gray-300 text-gray-500 hover:bg-gray-400' : 'bg-gradient-to-r from-purple-600 to-pink-500 text-white')}`}>{isGenerating ? (<><Loader2 size={16} className="animate-spin"/> Processing...</>) : !canAfford ? (<><Lock size={16}/> Add More Tokens</>) : (<><Sparkles size={16}/> GENERATE ({selectedIds.length})</>)}</button>
             {!isGenerating && (<button onClick={handleBack} className="w-full mt-3 py-2 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"><ArrowLeft size={12}/> Back to Camera</button>)}
         </div>
      </div>

      {/* PREVIEW KANAN (Copy Paste, ganti onClick handleNext) */}
      <div className="flex-1 bg-gray-100 p-8 overflow-y-auto flex flex-col items-center">
         <div className="w-full max-w-3xl space-y-8">
             {/* ... (Grid Foto sama) ... */}
             <div>
                 <div className="flex justify-between items-end mb-3"><h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2"><MousePointerClick size={14}/> Select Photos</h4>{enableSelection && (<button onClick={() => setSelectedIds(selectedIds.length === originalPhotos.length ? [] : originalPhotos.map(p => p.id))} className="text-[10px] font-bold text-purple-600 hover:underline">{selectedIds.length === originalPhotos.length ? "Deselect All" : "Select All"}</button>)}</div>
                 <div className="flex gap-7 overflow-x-auto pt-4 pb-4 scrollbar-hide px-2">
                     {originalPhotos.map((photo, i) => {
                         const isSelected = selectedIds.includes(photo.id);
                         return (<div key={photo.id} onClick={() => toggleSelection(photo.id)} className={`group relative w-32 md:w-40 aspect-[4/3] flex-shrink-0 cursor-pointer transition-all duration-300 ${isSelected ? 'ring-4 ring-purple-500 scale-105 shadow-xl z-10' : 'opacity-60 hover:opacity-100 scale-95 grayscale hover:grayscale-0'}`}><img src={photo.src} className="w-full h-full object-cover rounded-lg bg-white" /><div className={`absolute -top-2 -right-2 rounded-full bg-white transition-all ${isSelected ? 'text-purple-600 scale-100' : 'text-gray-300 scale-90'}`}>{isSelected ? <CheckCircle2 size={24} fill="white" className="text-purple-600"/> : <Circle size={24} fill="white"/>}</div><div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-1.5 rounded backdrop-blur-sm">ORIGINAL</div></div>);
                     })}
                 </div>
             </div>

             <div className="flex justify-center text-purple-300"><ArrowRight size={24} className="rotate-90"/></div>

             {/* Output Preview */}
             <div>
                 <h4 className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"/> Output Preview</h4>
                 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-2">
                     {[...Array(layout.slots)].map((_, i) => {
                         const resultSrc = aiPhotos[i]; const isProcessing = resultSrc === null; const isAiResult = generatedAiCache[i] !== null;
                         return (<div key={i} className={`relative group w-32 md:w-40 aspect-[4/3] flex-shrink-0 rounded-lg shadow-sm border transition-all overflow-hidden ${resultSrc ? 'bg-white p-1 border-purple-200' : 'bg-gray-200 border-dashed border-gray-300 flex items-center justify-center'}`}>{resultSrc ? (<><img src={resultSrc} className="w-full h-full object-cover rounded-md animate-in fade-in" />{!isGenerating && (<div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px] rounded-lg m-1 pointer-events-none group-hover:pointer-events-auto"><button onClick={() => setAdjustingPhotoIndex(i)} className="px-3 py-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-full font-bold text-[10px] flex items-center gap-1 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all"><SlidersHorizontal size={12}/> Adjust</button>{isAiResult && (<button onClick={() => handleRestoreOriginal(i)} className="px-3 py-1.5 bg-gray-800/90 hover:bg-black text-white rounded-full font-bold text-[10px] flex items-center gap-1 shadow-lg border border-gray-600 transform translate-y-2 group-hover:translate-y-0 transition-all delay-75"><Undo2 size={12}/> Original</button>)}</div>)}{isAiResult ? (<div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1"><Sparkles size={8}/> AI</div>) : (<div className="absolute top-2 right-2 bg-gray-800/80 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">RAW</div>)}</>) : (<div className="text-center">{isGenerating && isProcessing ? (<div className="flex flex-col items-center gap-2"><Loader2 className="animate-spin text-purple-500" size={20}/></div>) : (<span className="text-[10px] text-gray-400 font-bold">Waiting...</span>)}</div>)}</div>);
                     })}
                 </div>
             </div>
         </div>

         {isAllFilled && !isGenerating && (
             <div className="mt-auto pt-8 animate-in slide-in-from-bottom">
                 <button onClick={handleNext} className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold shadow-xl hover:scale-105 transition flex items-center gap-2">Next: Assembly <ArrowRight size={16}/></button>
             </div>
         )}
      </div>
    </div>
  );
}