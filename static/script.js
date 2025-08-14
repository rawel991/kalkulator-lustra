document.addEventListener('DOMContentLoaded', () => {
    // Referencje do elementów DOM
    const loginOverlay = document.getElementById('login-overlay');
    const appContainer = document.getElementById('app-container');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('login-error');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const fitWidthRadio = document.getElementById('fitWidth');
    const rhombusCountInput = document.getElementById('rhombusCount');
    const edgeLayoutCheckbox = document.getElementById('edgeLayout');
    const resultsDiv = document.getElementById('results');
    const canvas = document.getElementById('mirrorCanvas');
    const ctx = canvas.getContext('2d');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const priceM2Input = document.getElementById('priceM2');
    const priceMbInput = document.getElementById('priceMb');
    const bomResultsDiv = document.getElementById('bomResults');
    const calculateBomBtn = document.getElementById('calculateBomBtn');

    // --- LOGIKA LOGOWANIA ---
    loginBtn.addEventListener('click', async () => {
        const password = passwordInput.value;
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            if (response.ok) {
                loginOverlay.style.display = 'none';
                appContainer.style.display = 'flex';
                generateDesign();
            } else {
                loginError.style.display = 'block';
            }
        } catch (error) {
            loginError.innerText = 'Błąd połączenia z serwerem.';
            loginError.style.display = 'block';
        }
    });
    
    // ==================================================================
    //  FUNKCJE POMOCNICZE DO RYSOWANIA NA CANVAS
    // ==================================================================
    function drawDimensionLineOnCanvas(context, x1, y1, x2, y2, text) {
        const offset = 30; const tickSize = 8;
        context.save();
        context.strokeStyle = '#d32f2f'; context.fillStyle = '#d32f2f';
        context.lineWidth = 1; context.font = 'bold 14px Arial';
        context.textAlign = 'center'; context.textBaseline = 'middle';
        if (y1 === y2) { const y = y1 + offset; context.beginPath();
            context.moveTo(x1, y1); context.lineTo(x1, y + tickSize / 2);
            context.moveTo(x2, y2); context.lineTo(x2, y + tickSize / 2);
            context.moveTo(x1, y); context.lineTo(x2, y);
            context.moveTo(x1, y - tickSize); context.lineTo(x1, y + tickSize);
            context.moveTo(x2, y - tickSize); context.lineTo(x2, y + tickSize);
            context.stroke(); context.fillText(text, (x1 + x2) / 2, y + 15);
        } else if (x1 === x2) { const x = x1 + offset; context.beginPath();
            context.moveTo(x1, y1); context.lineTo(x + tickSize / 2, y1);
            context.moveTo(x2, y2); context.lineTo(x + tickSize / 2, y2);
            context.moveTo(x, y1); context.lineTo(x, y2);
            context.moveTo(x - tickSize, y1); context.lineTo(x + tickSize, y1);
            context.moveTo(x - tickSize, y2); context.lineTo(x + tickSize, y2);
            context.stroke(); context.save();
            context.translate(x + 15, (y1 + y2) / 2); context.rotate(-Math.PI / 2);
            context.fillText(text, 0, 0); context.restore();
        }
        context.restore();
    }
    function drawRhombusOnCanvas(context, cx, cy, d) {
        const halfDiag = d / 2;
        context.moveTo(cx, cy - halfDiag); context.lineTo(cx + halfDiag, cy);
        context.lineTo(cx, cy + halfDiag); context.lineTo(cx - halfDiag, cy);
        context.closePath();
    }

    // GŁÓWNA FUNKCJA - rysuje i oblicza podstawowe dane
    function generateDesign() {
        bomResultsDiv.innerHTML = '';
        const W = parseFloat(widthInput.value); const H = parseFloat(heightInput.value);
        const n = parseInt(rhombusCountInput.value); const fitAxis = fitWidthRadio.checked ? 'width' : 'height';
        const useEdgeLayout = edgeLayoutCheckbox.checked;
        if (isNaN(W) || isNaN(H) || isNaN(n) || W <= 0 || H <= 0 || n <= 0) {
            resultsDiv.innerHTML = `<span style="color: red;">Błąd: Wszystkie pola muszą być wypełnione poprawnymi, dodatnimi liczbami.</span>`;
            canvas.width = document.querySelector('.canvas-container').clientWidth;
            canvas.height = document.querySelector('.canvas-container').clientHeight;
            return;
        }
        const d = fitAxis === 'width' ? W / n : H / n; const s = d / Math.sqrt(2);
        const weight = (W / 1000) * (H / 1000) * 10;
        let resultsHTML = `Szacunkowa waga projektu: <strong>${weight.toFixed(2)} kg</strong><hr style="border: none; border-top: 1px solid #ccc; margin: 10px 0;">Obliczona przekątna (d): <strong>${d.toFixed(1)} mm</strong><br>Bok pełnego lustra (s): <strong>${s.toFixed(1)} mm</strong>`;
        if (s < 80) { resultsHTML += `<br><span style="color: red; font-weight: bold;">UWAGA: Wymiar lustra jest mniejszy niż 80x80 mm!</span>`; }
        if (!useEdgeLayout) { const cutHeight = (H % d) / 2; const cutWidth = (W % d) / 2;
            const side_cut_Y = cutHeight * Math.sqrt(2); const side_cut_X = cutWidth * Math.sqrt(2);
            if (side_cut_Y > 1) { resultsHTML += `<br>Bok docinki (góra/dół): <strong>${side_cut_Y.toFixed(1)} mm</strong>`; }
            if (side_cut_X > 1) { resultsHTML += `<br>Bok docinki (boki): <strong>${side_cut_X.toFixed(1)} mm</strong>`; }
        }
        resultsDiv.innerHTML = resultsHTML;

        // Rysowanie na canvas
        const canvasPadding = 80;
        const scale = Math.min((document.querySelector('.canvas-container').clientWidth - 2 * canvasPadding) / W, (window.innerHeight * 0.8 - 2 * canvasPadding) / H);
        canvas.width = W * scale + 2 * canvasPadding; canvas.height = H * scale + 2 * canvasPadding;
        ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.translate(canvasPadding, canvasPadding);
        const d_scaled = d * scale; const half_d_scaled = d_scaled / 2;
        ctx.save();
        ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, W * scale, H * scale);
        ctx.beginPath(); ctx.rect(0, 0, W * scale, H * scale); ctx.clip();
        ctx.beginPath(); ctx.strokeStyle = '#444'; ctx.lineWidth = 2;
        if (useEdgeLayout) { const centeringOffsetX = (W % d) / 2; const centeringOffsetY = (H % d) / 2;
            const layoutShift = d / 2; const totalOffsetX_scaled = (centeringOffsetX + layoutShift) * scale;
            const totalOffsetY_scaled = (centeringOffsetY + layoutShift) * scale;
            const cols = Math.ceil(W / half_d_scaled) + 4; const rows = Math.ceil(H / half_d_scaled) + 4;
            for (let i = -2; i < cols; i++) { for (let j = -2; j < rows; j++) {
                if ((i + j) % 2 !== 0) { const cx = i * half_d_scaled + totalOffsetX_scaled;
                    const cy = j * half_d_scaled + totalOffsetY_scaled; drawRhombusOnCanvas(ctx, cx, cy, d_scaled);
                }}}
        } else { const offsetX_scaled = ((W % d) / 2) * scale; const offsetY_scaled = ((H % d) / 2) * scale;
            const numTiles = Math.ceil(Math.max(W, H) / d) + 4;
            for (let i = -numTiles; i < numTiles; i++) { for (let j = -numTiles; j < numTiles; j++) {
                const cx1 = i * d_scaled + offsetX_scaled; const cy1 = j * d_scaled + offsetY_scaled;
                drawRhombusOnCanvas(ctx, cx1, cy1, d_scaled); const cx2 = cx1 + half_d_scaled;
                const cy2 = cy1 + half_d_scaled; drawRhombusOnCanvas(ctx, cx2, cy2, d_scaled);
                }}}
        ctx.stroke(); ctx.restore();
        drawDimensionLineOnCanvas(ctx, 0, H * scale, W * scale, H * scale, `${W.toFixed(1)} mm`);
        drawDimensionLineOnCanvas(ctx, W * scale, 0, W * scale, H * scale, `${H.toFixed(1)} mm`);
    }

    // OSOBNA FUNKCJA DO KOMUNIKACJI Z SERWEREM
    async function handleBomCalculation() {
        bomResultsDiv.innerHTML = '<i>Obliczanie...</i>';
        
        const W = parseFloat(widthInput.value); const H = parseFloat(heightInput.value);
        const n = parseInt(rhombusCountInput.value); const fitAxis = fitWidthRadio.checked ? 'width' : 'height';
        const useEdgeLayout = edgeLayoutCheckbox.checked;
        const d = fitAxis === 'width' ? W / n : H / n;

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ W, H, d, useEdgeLayout })
            });
            if (!response.ok) { throw new Error('Serwer zwrócił błąd'); }
            const bom = await response.json();
            let bomHTML = `<h3>Zestawienie Produkcyjne</h3><ul>`;
            const sortedGrouped = Object.entries(bom.grouped).sort((a, b) => b[1] - a[1]);
            for (const [signature, count] of sortedGrouped) {
                bomHTML += `<li>${signature}: <strong>${count} szt.</strong></li>`;
            }
            bomHTML += `</ul><hr>`;
            const priceM2 = parseFloat(priceM2Input.value) || 0;
            const priceMb = parseFloat(priceMbInput.value) || 0;
            const totalPrice = (bom.area * priceM2) + (bom.perimeter * priceMb);
            bomHTML += `Całkowita ilość formatek: <strong>${bom.count} szt.</strong><br>Powierzchnia materiału: <strong>${bom.area.toFixed(3)} m²</strong><br>Długość krawędzi (szlif): <strong>${bom.perimeter.toFixed(2)} mb</strong><br><h3 style="margin-top: 10px;">Szacunkowa cena: <strong>${totalPrice.toFixed(2)} zł</strong></h3>`;
            bomResultsDiv.innerHTML = bomHTML;
        } catch (error) {
            console.error("Błąd komunikacji z serwerem:", error);
            bomResultsDiv.innerHTML = `<span style="color: red;">Błąd przy obliczaniu zestawienia. Upewnij się, że serwer jest uruchomiony.</span>`;
        }
    }

    // ==================================================================
    //  PRZYWRÓCONA FUNKCJA GENEROWANIA PDF
    // ==================================================================
    async function generatePDF() {
        try { 
            if (typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') { 
                alert("Błąd: Biblioteki PDF nie mogły zostać załadowane. Sprawdź połączenie z internetem."); return; 
            } 
            const { jsPDF } = window.jspdf; 
            const W = parseFloat(widthInput.value); const H = parseFloat(heightInput.value); 
            if (isNaN(W) || isNaN(H) || W <= 0 || H <= 0) { alert("Wprowadź poprawne wymiary."); return; } 
            
            const n = parseInt(rhombusCountInput.value); const fitAxis = fitWidthRadio.checked ? 'width' : 'height'; 
            const useEdgeLayout = edgeLayoutCheckbox.checked; 
            const d = fitAxis === 'width' ? W / n : H / n; 

            const canvasImage = await html2canvas(canvas, { scale: 2, backgroundColor: '#ffffff' }); 
            const imgData = canvasImage.toDataURL('image/jpeg', 0.9); 
            
            const filename = `glamour ${W}x${H}.pdf`; 
            const pdf = new jsPDF('p', 'mm', 'a4'); 
            pdf.setFont('helvetica', 'normal'); 
            const pdfWidth = pdf.internal.pageSize.getWidth(); 
            const pdfHeight = pdf.internal.pageSize.getHeight(); 
            const margin = 15; 
            let currentY = margin; 

            pdf.setFontSize(18); 
            pdf.text('Projekt Lustra: Glamour', pdfWidth / 2, currentY, { align: 'center' }); 
            currentY += 5; 
            pdf.setFontSize(10); 
            pdf.text(new Date().toLocaleDateString('pl-PL'), pdfWidth - margin, currentY, { align: 'right' }); 
            currentY += 10; 
            
            const imgProps = pdf.getImageProperties(imgData); 
            const imgRatio = imgProps.height / imgProps.width; 
            let imgWidth = pdfWidth - margin * 2; 
            let imgHeight = imgWidth * imgRatio; 
            const maxHeight = pdfHeight * 0.6; 
            if(imgHeight > maxHeight) { 
                imgHeight = maxHeight; 
                imgWidth = imgHeight / imgRatio; 
            } 
            const x_pos = (pdfWidth - imgWidth) / 2; 
            pdf.addImage(imgData, 'JPEG', x_pos, currentY, imgWidth, imgHeight); 
            currentY += imgHeight + 10; 

            pdf.setFontSize(14); 
            pdf.text('Specyfikacja Projektu:', margin, currentY); 
            currentY += 8; 
            pdf.setFontSize(11); 
            pdf.setTextColor(0, 0, 0); 
            
            const s = d / Math.sqrt(2); const weight = (W / 1000) * (H / 1000) * 10; 
            const specLines = []; 
            specLines.push(`Szacunkowa waga projektu: ${weight.toFixed(2)} kg`); 
            specLines.push(`Obliczona przekatna (d): ${d.toFixed(1)} mm`); 
            specLines.push(`Bok pelnego lustra (s): ${s.toFixed(1)} mm`); 
            if (!useEdgeLayout) { 
                const side_cut_Y = ((H % d) / 2) * Math.sqrt(2); 
                if (side_cut_Y > 1) { specLines.push(`Bok docinki (gora/dol): ${side_cut_Y.toFixed(1)} mm`); } 
                const side_cut_X = ((W % d) / 2) * Math.sqrt(2); 
                if (side_cut_X > 1) { specLines.push(`Bok docinki (boki): ${side_cut_X.toFixed(1)} mm`); } 
            } 
            pdf.text(specLines, margin, currentY, { lineHeightFactor: 1.5 }); 
            pdf.save(filename); 
        } catch(error) { 
            console.error("Błąd podczas generowania PDF:", error); 
            alert("Wystąpił błąd podczas generowania PDF. Spróbuj odświeżyć stronę."); 
        } 
    }

    // Event Listeners
    document.querySelector('.controls').addEventListener('change', generateDesign);
    calculateBomBtn.addEventListener('click', handleBomCalculation);
    downloadPdfBtn.addEventListener('click', generatePDF);
    
    // Uruchomienie logowania zamiast pierwszego rysunku
    // generateDesign();
});
