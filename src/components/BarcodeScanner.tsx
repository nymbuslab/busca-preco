import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

// Formatos relevantes para varejo (EAN-13 e variantes mais comuns).
const NATIVE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
];

// BarcodeDetector ainda nao tem typings nativos — declaracao minima.
type NativeBarcodeDetector = {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string; format: string }>>;
};
declare global {
  interface Window {
    BarcodeDetector?: new (init?: { formats?: string[] }) => NativeBarcodeDetector;
  }
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"native" | "zxing" | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const detectorRef = useRef<NativeBarcodeDetector | null>(null);
  const rafRef = useRef<number | null>(null);

  // refs para callbacks — evita loops por dependencia trocando
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  const stopScanner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
    zxingReaderRef.current = null;
    detectorRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  const handleHit = useCallback((barcode: string) => {
    onScanRef.current(barcode);
    toast.success("Código lido com sucesso!", {
      description: `Código: ${barcode}`,
      duration: 2000,
    });
    if ("vibrate" in navigator) {
      navigator.vibrate(100);
    }
    onCloseRef.current();
  }, []);

  const startNative = useCallback(async () => {
    setMode("native");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const Ctor = window.BarcodeDetector!;
    detectorRef.current = new Ctor({ formats: NATIVE_FORMATS });
    setIsScanning(true);

    let busy = false;
    const loop = async () => {
      if (!videoRef.current || !detectorRef.current) return;
      if (!busy) {
        busy = true;
        try {
          const codes = await detectorRef.current.detect(videoRef.current);
          if (codes && codes.length > 0) {
            handleHit(codes[0].rawValue);
            return;
          }
        } catch {
          // frame ainda nao pronto ou nada detectado — ignora
        }
        busy = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [handleHit]);

  const startZxing = useCallback(async () => {
    setMode("zxing");
    if (!videoRef.current) return;
    setIsScanning(true);

    const reader = new BrowserMultiFormatReader();
    zxingReaderRef.current = reader;

    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    const back = devices.find((d) =>
      ["back", "environment", "traseira"].some((k) =>
        d.label.toLowerCase().includes(k),
      ),
    );

    const controls = await reader.decodeFromVideoDevice(
      back ? back.deviceId : undefined,
      videoRef.current,
      (result, _err, ctrls) => {
        if (result) {
          handleHit(result.getText());
          ctrls.stop();
        }
      },
    );
    zxingControlsRef.current = controls;
  }, [handleHit]);

  const startScanner = useCallback(async () => {
    setError(null);
    try {
      const hasNative =
        typeof window !== "undefined" &&
        typeof window.BarcodeDetector === "function";
      if (hasNative) {
        await startNative();
      } else {
        await startZxing();
      }
    } catch (err) {
      console.error("Scanner error:", err);
      setIsScanning(false);
      if (err instanceof Error) {
        if (
          err.name === "NotAllowedError" ||
          err.message.includes("Permission denied")
        ) {
          setError("Permissão de câmera negada. Permita o acesso e tente novamente.");
        } else if (err.name === "NotFoundError") {
          setError("Nenhuma câmera encontrada no dispositivo.");
        } else if (err.name === "NotReadableError") {
          setError("Câmera em uso por outro aplicativo.");
        } else {
          setError("Erro ao acessar a câmera.");
        }
      }
    }
  }, [startNative, startZxing]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(t);
    }
    stopScanner();
  }, [isOpen, startScanner, stopScanner]);

  // cleanup on unmount
  useEffect(() => () => stopScanner(), [stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-3 border-b border-foreground/15">
          <DialogTitle className="flex items-center justify-center gap-2 smallcaps text-xs font-mono font-medium">
            <Camera className="h-3.5 w-3.5 text-primary" />
            Leitor de código de barras
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Container do video — aspect 4:3, fundo preto */}
          <div
            className="relative w-full bg-black overflow-hidden"
            style={{ aspectRatio: "4 / 3" }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Viewfinder: mascara escura + janela de leitura */}
            {isScanning && !error && (
              <div className="absolute inset-0 pointer-events-none">
                {/* 4 retangulos escurecidos cercando a janela central
                   (janela = 70% width centralizada x 30% height centralizada) */}
                <div className="absolute inset-x-0 top-0 h-[35%] bg-black/55" />
                <div className="absolute inset-x-0 bottom-0 h-[35%] bg-black/55" />
                <div className="absolute top-[35%] bottom-[35%] left-0 w-[15%] bg-black/55" />
                <div className="absolute top-[35%] bottom-[35%] right-0 w-[15%] bg-black/55" />

                {/* Janela de leitura */}
                <div className="absolute left-[15%] right-[15%] top-[35%] bottom-[35%]">
                  {/* 4 cantos em angulo reto */}
                  <span className="absolute -top-px -left-px w-7 h-7 border-t-2 border-l-2 border-white/90" />
                  <span className="absolute -top-px -right-px w-7 h-7 border-t-2 border-r-2 border-white/90" />
                  <span className="absolute -bottom-px -left-px w-7 h-7 border-b-2 border-l-2 border-white/90" />
                  <span className="absolute -bottom-px -right-px w-7 h-7 border-b-2 border-r-2 border-white/90" />

                  {/* Scan line animada */}
                  <span
                    className="absolute left-2 right-2 h-[2px] scan-line"
                    style={{
                      background: "hsl(var(--primary))",
                      boxShadow: "0 0 10px 1px hsl(var(--primary) / 0.7)",
                    }}
                  />
                </div>

                {/* Badge do modo no canto superior direito */}
                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60">
                  <span className="font-mono text-[9px] text-white/75 smallcaps">
                    {mode === "native" ? "Nativo" : "ZXing"}
                  </span>
                </div>

                <p className="absolute bottom-3 inset-x-0 text-center font-mono text-[10px] text-white/85 smallcaps tracking-wider">
                  Enquadre o código na área
                </p>
              </div>
            )}

            {/* Estado: iniciando camera */}
            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85">
                <div className="text-center text-white/70">
                  <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p className="font-mono text-xs smallcaps">Iniciando câmera</p>
                </div>
              </div>
            )}

            {/* Estado: erro */}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4">
                <div className="text-center text-white max-w-xs">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-3 border border-destructive/50">
                    <X className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-sm text-white/85 mb-4">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startScanner}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
