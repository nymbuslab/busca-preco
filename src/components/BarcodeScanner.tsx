import { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  
  // Refs para callbacks para evitar re-renderizações e loops de dependência
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  }, [onScan, onClose]);

  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    codeReader.current = null;
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    
    setError(null);
    setIsScanning(true);

    try {
      codeReader.current = new BrowserMultiFormatReader();
      
      // Busca dispositivos de vídeo
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      // Tenta encontrar câmera traseira
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('traseira')
      );
      
      const deviceId = backCamera ? backCamera.deviceId : undefined;
      
      const controls = await codeReader.current.decodeFromVideoDevice(
        deviceId, 
        videoRef.current, 
        (result, error, controls) => {
          if (result) {
            const barcode = result.getText();
            onScanRef.current(barcode);
            controls.stop();
            onCloseRef.current();
            
            toast.success("Código lido com sucesso!", {
              description: `Código: ${barcode}`,
              duration: 2000,
            });
            
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          }
        }
      );
      
      controlsRef.current = controls;

    } catch (err) {
      console.error("Scanner error:", err);
      setIsScanning(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes("Permission denied")) {
          setError("Permissão de câmera negada. Por favor, permita o acesso à câmera.");
        } else if (err.name === 'NotFoundError') {
          setError("Nenhuma câmera encontrada no dispositivo.");
        } else {
          setError("Erro ao acessar a câmera. Tente novamente.");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center justify-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Leia o Código de Barras
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-4 pb-4">
          <div 
            className="relative w-full bg-black rounded-lg overflow-hidden"
            style={{ minHeight: "280px" }}
          >
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
              style={{ minHeight: "280px" }}
            />
            
            {!isScanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary">
                <div className="text-center text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-2 animate-pulse" />
                  <p>Iniciando câmera...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-secondary p-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <X className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startScanner}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3">
            Posicione o código de barras dentro da área de leitura
          </p>

          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full mt-4"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
