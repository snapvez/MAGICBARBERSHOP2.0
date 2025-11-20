import { useState, useEffect } from 'react';
import { Download, QrCode } from 'lucide-react';

export const QRCodeGenerator = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const installUrl = `${window.location.origin}/install.html`;

  useEffect(() => {
    const generateQR = async () => {
      const encoded = encodeURIComponent(installUrl);
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encoded}&color=D4AF37&bgcolor=000000`;
      setQrCodeUrl(url);
    };
    generateQR();
  }, [installUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'magic-barber-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - Magic Barber</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
                background: white;
              }
              .container {
                text-align: center;
                border: 3px solid #D4AF37;
                padding: 40px;
                border-radius: 20px;
                background: #000;
              }
              h1 {
                color: #D4AF37;
                margin: 0 0 10px 0;
                font-size: 36px;
                text-shadow: 0 2px 10px rgba(212, 175, 55, 0.5);
              }
              .subtitle {
                color: #FFD700;
                font-size: 14px;
                letter-spacing: 3px;
                margin-bottom: 30px;
                text-transform: uppercase;
              }
              img {
                width: 300px;
                height: 300px;
                margin: 20px 0;
                border: 5px solid #D4AF37;
                border-radius: 15px;
                background: white;
                padding: 10px;
              }
              .instructions {
                color: #FFD700;
                margin-top: 20px;
                font-size: 18px;
                font-weight: bold;
              }
              .url {
                color: #D4AF37;
                margin-top: 10px;
                font-size: 14px;
                font-family: monospace;
              }
              @media print {
                body {
                  padding: 20px;
                }
                .container {
                  border: 2px solid #000;
                  background: white;
                }
                h1, .subtitle, .instructions {
                  color: #000;
                }
                img {
                  border-color: #000;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>MAGIC BARBERSHOP</h1>
              <p class="subtitle">Na Régua Como Deve Ser</p>
              <img src="${qrCodeUrl}" alt="QR Code">
              <p class="instructions">📱 Aponta a câmara para instalar a app</p>
              <p class="url">${installUrl}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-magic-black rounded-xl shadow-2xl border-2 border-magic-gold/50 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-magic-gold/20 rounded-xl flex items-center justify-center">
          <QrCode className="w-6 h-6 text-magic-gold" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-magic-gold">QR Code para Instalação</h2>
          <p className="text-sm text-magic-yellow/70">Partilha com os clientes</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl mb-6 inline-block">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="QR Code para instalar app"
            className="w-64 h-64"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-magic-gold border-t-transparent"></div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-magic-gold/10 border border-magic-gold/30 rounded-lg p-4">
          <p className="text-sm text-magic-yellow mb-2 font-semibold">🔗 Link de Instalação:</p>
          <code className="text-xs text-magic-gold break-all bg-black/30 p-2 rounded block">
            {installUrl}
          </code>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-magic-gold hover:bg-magic-yellow text-magic-black rounded-lg transition-all font-semibold shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            Descarregar
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-magic-gold/20 hover:bg-magic-gold/30 text-magic-gold border-2 border-magic-gold/50 rounded-lg transition-all font-semibold"
          >
            <QrCode className="w-5 h-5" />
            Imprimir
          </button>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
          <p className="text-sm text-blue-400 font-semibold mb-2">💡 Como Usar:</p>
          <ul className="text-xs text-blue-300 space-y-1">
            <li>• Imprime o QR code e coloca na barbearia</li>
            <li>• Clientes apontam a câmara do telemóvel</li>
            <li>• Seguem as instruções para instalar</li>
            <li>• A app fica no ecrã principal como app nativa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
