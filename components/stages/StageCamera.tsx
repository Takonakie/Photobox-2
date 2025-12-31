"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, RotateCcw, ChevronRight, Timer, ArrowLeft, Upload, Clock } from "lucide-react";
import { LayoutConfig, PhotoData } from "@/src/types/photobooth";

interface StageCameraProps {
  layout: LayoutConfig;
  onComplete: (photos: PhotoData[]) => void;
  onBack: () => void;
  initialPhotos?: PhotoData[];
}

export default function StageCamera({ layout, onComplete, onBack, initialPhotos }: StageCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref untuk input file
  
  const [photos, setPhotos] = useState<(string | null)[]>(() => {
      // Cek: Apakah ada data foto lama (initialPhotos) yang dikirim?
      if (initialPhotos && initialPhotos.length === layout.slots) {
          // JIKA ADA: Gunakan foto tersebut sebagai state awal (JANGAN RESET)
          return initialPhotos.map(p => p.src);
      }
      // JIKA TIDAK ADA: Baru buat array kosong (RESET)
      return Array(layout.slots).fill(null);
  });
  
  // --- STATE SETTING ---
  const [timerDuration, setTimerDuration] = useState<number>(3); // Default 3 detik
  
  // --- STATE LOGIKA KAMERA ---
  const [currentSlot, setCurrentSlot] = useState<number>(0); 
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [flash, setFlash] = useState(false);

  // --- FUNGSI JEPRET ---
  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setFlash(true);
        setTimeout(() => setFlash(false), 200);

        setPhotos(prev => {
          const newPhotos = [...prev];
          newPhotos[currentSlot] = imageSrc;
          return newPhotos;
        });
      }
    }
  }, [currentSlot]);

  // --- LOGIKA TIMER (Jantung Aplikasi) ---
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isSessionActive && countdown !== null) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        // 1. Timer habis -> CEKREK!
        capture();
        
        // 2. Jeda sebentar, lalu lanjut ke slot berikutnya
        setTimeout(() => {
            setPhotos((currentPhotos) => {
                const nextEmptyIndex = currentPhotos.findIndex(p => p === null);
                
                if (nextEmptyIndex !== -1) {
                    // Masih ada slot kosong -> Pindah slot -> Reset Timer sesuai pilihan user
                    setCurrentSlot(nextEmptyIndex);
                    setCountdown(timerDuration); // Menggunakan durasi yang dipilih user
                } else {
                    // Penuh -> Stop
                    setIsSessionActive(false);
                    setCountdown(null);
                }
                return currentPhotos;
            });
        }, 1000); 
      }
    }
    return () => clearTimeout(timer);
  }, [isSessionActive, countdown, capture, timerDuration]);

  // --- TOMBOL MULAI SESI FOTO ---
  const startSession = () => {
    const firstEmpty = photos.findIndex(p => p === null);
    if (firstEmpty === -1) {
        alert("All slots are full. Please retake a specific photo or click Next.");
        return;
    }
    setCurrentSlot(firstEmpty);
    setIsSessionActive(true);
    setCountdown(timerDuration); // Mulai hitung mundur sesuai pilihan
  };

  // --- TOMBOL RETAKE ---
  const retakeSpecific = (index: number) => {
    setIsSessionActive(false);
    setCountdown(null);
    setCurrentSlot(index);
    setPhotos(prev => {
        const n = [...prev];
        n[index] = null;
        return n;
    });
  };

  // --- FUNGSI UPLOAD ---
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Hitung berapa slot kosong yang tersisa
    const emptyIndices = photos.map((p, i) => p === null ? i : -1).filter(i => i !== -1);
    
    if (emptyIndices.length === 0) {
        alert("No empty slots available. Please retake a photo to upload.");
        return;
    }

    // Batasi jumlah file yang diproses sesuai slot kosong
    const filesToProcess = Array.from(files).slice(0, emptyIndices.length);

    // Proses file (Convert ke Base64)
    const newImages = await Promise.all(
        filesToProcess.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        })
    );

    // Masukkan gambar ke slot kosong
    setPhotos(prev => {
        const updated = [...prev];
        newImages.forEach((imgSrc, i) => {
            const targetIndex = emptyIndices[i];
            updated[targetIndex] = imgSrc;
        });
        return updated;
    });

    // Reset input value supaya bisa upload file yang sama jika perlu
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- FINISH ---
  const handleFinish = () => {
    const finalPhotos: PhotoData[] = photos.map((src, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        src: src || "",
        filter: "none"
    }));
    onComplete(finalPhotos);
  };

  const allPhotosTaken = photos.every(p => p !== null);

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[600px] relative bg-gray-900 text-white overflow-hidden md:overflow-visible">
      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        className="hidden" 
      />
      
      {/* EFEK FLASH */}
      <div className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-200 ${flash ? 'opacity-100' : 'opacity-0'}`} />

      {/* --- KIRI: VIEWFINDER --- */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6">
         
         {/* Container Kamera */}
         <div className="relative w-full max-w-2xl aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800">
            {/* OVERLAY COUNTDOWN */}
            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20">
                    <div className="text-[150px] font-black text-white drop-shadow-2xl animate-ping opacity-90">
                        {countdown}
                    </div>
                </div>
            )}

            <Webcam 
                ref={webcamRef} 
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover transform scale-x-[-1]" 
                videoConstraints={{ facingMode: "user" }}
            />
         </div>

         {/* --- CONTROLS AREA --- */}
         <div className="mt-6 flex flex-col items-center gap-4 w-full max-w-2xl">
            
            {/* PILIHAN TIMER (Hanya muncul jika tidak sedang merekam) */}
            {!isSessionActive && !allPhotosTaken && (
                <div className="flex items-center gap-4 bg-gray-800 p-2 rounded-full mb-2">
                    <div className="flex items-center gap-2 px-3 text-gray-400">
                        <Clock size={18} /> <span className="text-sm font-bold uppercase">Timer</span>
                    </div>
                    {[3, 5, 10].map((t) => (
                        <button 
                            key={t}
                            onClick={() => setTimerDuration(t)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                                timerDuration === t 
                                ? 'bg-pink-500 text-white scale-110 shadow-lg' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {t}s
                        </button>
                    ))}
                </div>
            )}

            <div className="flex gap-4 items-center">
                 {/* TOMBOL START / UPLOAD */}
                 {!isSessionActive && !allPhotosTaken && (
                     <>
                        <button 
                            onClick={triggerFileUpload} 
                            className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-l-full font-bold text-lg shadow-lg hover:scale-105 transition flex items-center gap-2 border-r border-gray-600"
                            title="Upload Photos"
                        >
                           <Upload size={24}/>
                        </button>
                        <button 
                            onClick={startSession} 
                            className="px-12 py-4 bg-pink-500 hover:bg-pink-600 text-white rounded-r-full font-bold text-lg shadow-lg hover:scale-105 transition flex items-center gap-2"
                        >
                           <Camera size={24}/> START
                        </button>
                     </>
                 )}
                 
                 {/* INDIKATOR RECORDING */}
                 {isSessionActive && (
                     <div className="px-8 py-3 bg-red-500/20 text-red-200 border border-red-500/50 rounded-full font-mono font-bold animate-pulse flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"/> 
                        RECORDING SLOT {currentSlot + 1}/{layout.slots} 
                        <span className="text-xs ml-2 opacity-70">({timerDuration}s timer)</span>
                     </div>
                 )}

                 {/* TOMBOL NEXT */}
                 {allPhotosTaken && (
                     <button onClick={handleFinish} className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold text-lg shadow-lg hover:scale-105 transition flex items-center gap-2">
                        NEXT STEP <ChevronRight size={24}/>
                     </button>
                 )}
            </div>
         </div>
      </div>

      {/* --- KANAN: SIDEBAR HASIL --- */}
      <div className="w-full md:w-80 bg-white text-gray-800 p-4 flex flex-col border-t md:border-t-0 md:border-l border-gray-200 z-10 shadow-xl h-auto md:h-full shrink-0">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-lg uppercase tracking-wider">Results</h3>
             <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded font-mono font-bold">{layout.name}</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {[...Array(layout.slots)].map((_, i) => (
                  <div key={i} className="flex gap-3 items-center group">
                      <div className="w-6 font-bold text-gray-400 text-lg font-mono">{i+1}</div>
                      <div className="flex-1 aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 relative group-hover:border-purple-400 transition shadow-sm">
                          {photos[i] ? (
                              <>
                                <img src={photos[i]!} className="w-full h-full object-cover" />
                                {!isSessionActive && (
                                    <button 
                                            onClick={() => retakeSpecific(i)}
                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white gap-1 backdrop-blur-[1px]"
                                    >
                                            <RotateCcw size={20}/>
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Retake</span>
                                    </button>
                                )}
                              </>
                          ) : (
                              <div className={`w-full h-full flex flex-col items-center justify-center ${currentSlot === i && isSessionActive ? 'bg-purple-50 border-purple-500 border-solid border-2 animate-pulse' : ''}`}>
                                  {currentSlot === i && isSessionActive ? (
                                      <Timer size={24} className="text-purple-500 animate-spin mb-1" />
                                  ) : (
                                      <span className="text-xs text-gray-400 font-medium">Empty</span>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={onBack} className="flex items-center justify-center gap-2 text-gray-400 hover:text-gray-800 text-sm font-bold py-2 w-full transition-colors">
                <ArrowLeft size={16}/> Change Layout
            </button>
          </div>
      </div>
    </div>
  );
}