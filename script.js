   // Configurar MathJax para renderizado LaTeX
   window.MathJax = {
    tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
    },
    options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
    }
};

// Referencias DOM
const markdownInput = document.getElementById('markdown-input');
const preview = document.getElementById('preview');
const filenameInput = document.getElementById('filename');
const loading = document.getElementById('loading');
const wordCount = document.getElementById('word-count');

// Asegura que la vista previa se actualice al escribir
markdownInput.addEventListener('input', updatePreview);

// Configurar marked
marked.setOptions({
    breaks: true,
    gfm: true,
    sanitize: false
});

// Procesar LaTeX y marcarlo para MathJax
function processLatex(html) {
    console.log('Procesando LaTeX...');
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, function(_, content) {
        return '<div class="math-display" data-math="' + content.trim() + '">$$' + content + '$$</div>';
    });
    html = html.replace(/\$([^$\r\n]*?[^$\s][^$\r\n]*?)\$/g, function(_, content) {
        return '<span class="math-inline" data-math="' + content.trim() + '">$' + content + '$</span>';
    });
    return html;
}

// Convertir LaTeX a imagen PNG usando MathJax con mayor resolución
async function latexToImageDataUrl(latex, display = true) {
    const svg = MathJax.tex2svg(latex, { display });
    const svgElement = svg.querySelector('svg');
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = 3;
            const canvas = document.createElement('canvas');
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = url;
    });
}

// Actualiza la vista previa y contador de palabras
function updatePreview() {
    const markdownText = markdownInput.value;
    let html = marked.parse(markdownText);
    html = processLatex(html);
    preview.innerHTML = html;
    
    // Actualizar contador de palabras
    const words = markdownText.trim().split(/\s+/).filter(word => word.length > 0);
    wordCount.textContent = `${words.length} palabras`;
    
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([preview]).then(() => {
            console.log('MathJax renderizado completado.');
        }).catch(err => {
            console.error('Error en MathJax:', err.message);
        });
    }
}
    
// Genera el PDF con fórmulas como imágenes
async function downloadPDF() {
    const filename = filenameInput.value.trim() || 'documento';
    if (loading) loading.style.display = 'block';
    console.log('Iniciando generación de PDF...');

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = preview.innerHTML;
        let currentY = 20;
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);
        const lineHeight = 7;

        function checkPageBreak(neededHeight) {
            if (currentY + neededHeight > pageHeight - margin) {
                pdf.addPage();
                currentY = 20;
                console.log('Salto de página agregado');
            }
        }

        function addText(text, fontSize, fontStyle, color = [0, 0, 0], indent = 0) {
            if (!text.trim()) return;
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', fontStyle);
            pdf.setTextColor(...color);
            const lines = pdf.splitTextToSize(text.trim(), maxWidth - indent);
            const neededHeight = lines.length * lineHeight;
            checkPageBreak(neededHeight);
            lines.forEach(line => {
                pdf.text(line, margin + indent, currentY);
                currentY += lineHeight;
            });
            currentY += 3;
        }

        function addLink(text, url, fontSize, indent = 0) {
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(0, 120, 212);
            const lines = pdf.splitTextToSize(text.trim(), maxWidth - indent);
            const neededHeight = lines.length * lineHeight;
            checkPageBreak(neededHeight);
            const startY = currentY;
            lines.forEach(line => {
                pdf.text(line, margin + indent, currentY);
                currentY += lineHeight;
            });
            pdf.link(margin + indent, startY - 5, maxWidth - indent, neededHeight, { url });
            currentY += 3;
        }

        async function processElement(element) {
            const tag = element.tagName.toLowerCase();
            console.log('Procesando elemento:', tag, element.textContent?.substring(0, 50));

            if (tag === 'h1') {
                currentY += 10;
                addText(element.textContent, 20, 'bold', [50, 49, 48]);
                pdf.setDrawColor(210, 208, 206);
                pdf.setLineWidth(0.5);
                pdf.line(margin, currentY - 3, pageWidth - margin, currentY - 3);
                currentY += 5;
            } else if (tag === 'h2') {
                currentY += 8;
                addText(element.textContent, 16, 'bold', [50, 49, 48]);
                pdf.setDrawColor(237, 235, 233);
                pdf.setLineWidth(0.3);
                pdf.line(margin, currentY - 3, pageWidth - margin, currentY - 3);
                currentY += 5;
            } else if (tag === 'h3') {
                currentY += 6;
                addText(element.textContent, 14, 'bold', [96, 94, 92]);
                currentY += 3;
            } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
                currentY += 4;
                addText(element.textContent, 12, 'bold', [96, 94, 92]);
                currentY += 2;
            } else if (tag === 'p') {
                await processInlineContent(element);
            } else if (tag === 'div' && element.classList.contains('math-display')) {
                const latex = element.getAttribute('data-math');
                if (latex) {
                    const imgData = await latexToImageDataUrl(latex, true);
                    checkPageBreak(35);
                    pdf.addImage(imgData, 'PNG', margin, currentY, 150, 30);
                    currentY += 40;
                }
            } else if (tag === 'ul' || tag === 'ol') {
                await processList(element, tag === 'ol');
            } else if (tag === 'blockquote') {
                currentY += 5;
                pdf.setDrawColor(0, 120, 212);
                pdf.setLineWidth(2);
                pdf.line(margin, currentY, margin, currentY + 20);
                await processInlineContent(element, 10);
                currentY += 5;
            } else if (tag === 'pre') {
                await processCodeBlock(element);
            } else if (tag === 'table') {
                await processTable(element);
            }
        }

        async function processInlineContent(element, indent = 0) {
            let text = '';
            const childNodes = Array.from(element.childNodes);
            
            for (let node of childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    text += node.textContent;
                } else if (node.tagName === 'A') {
                    if (text.trim()) {
                        addText(text, 11, 'normal', [50, 49, 48], indent);
                        text = '';
                    }
                    addLink(node.textContent, node.href, 11, indent);
                } else if (node.tagName === 'STRONG' || node.tagName === 'B') {
                    if (text.trim()) {
                        addText(text, 11, 'normal', [50, 49, 48], indent);
                        text = '';
                    }
                    addText(node.textContent, 11, 'bold', [50, 49, 48], indent);
                } else if (node.tagName === 'EM' || node.tagName === 'I') {
                    if (text.trim()) {
                        addText(text, 11, 'normal', [50, 49, 48], indent);
                        text = '';
                    }
                    addText(node.textContent, 11, 'italic', [50, 49, 48], indent);
                } else if (node.tagName === 'CODE') {
                    if (text.trim()) {
                        addText(text, 11, 'normal', [50, 49, 48], indent);
                        text = '';
                    }
                    addText(node.textContent, 10, 'normal', [0, 120, 212], indent);
                } else if (node.tagName === 'SPAN' && node.classList.contains('math-inline')) {
                    if (text.trim()) {
                        addText(text, 11, 'normal', [50, 49, 48], indent);
                        text = '';
                    }
                    const latex = node.getAttribute('data-math');
                    if (latex) {
                        const imgData = await latexToImageDataUrl(latex, false);
                        checkPageBreak(12);
                        pdf.addImage(imgData, 'PNG', margin + indent + 5, currentY, 30, 10);
                        currentY += 15;
                    }
                } else {
                    text += node.textContent;
                }
            }
            
            if (text.trim()) {
                addText(text, 11, 'normal', [50, 49, 48], indent);
            }
        }

        async function processList(listElement, isOrdered) {
            const items = listElement.querySelectorAll('li');
            for (let i = 0; i < items.length; i++) {
                const bullet = isOrdered ? `${i + 1}.` : '•';
                const text = `${bullet} ${items[i].textContent}`;
                addText(text, 11, 'normal', [50, 49, 48], 5);
            }
            currentY += 5;
        }

        async function processCodeBlock(preElement) {
            const code = preElement.textContent;
            currentY += 5;
            pdf.setFillColor(248, 248, 248);
            const lines = code.split('\n');
            const blockHeight = lines.length * 5 + 10;
            checkPageBreak(blockHeight);
            pdf.rect(margin, currentY - 5, maxWidth, blockHeight, 'F');
            
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(50, 49, 48);
            
            lines.forEach(line => {
                pdf.text(line || ' ', margin + 5, currentY);
                currentY += 5;
            });
            currentY += 10;
        }

        async function processTable(tableElement) {
            const rows = tableElement.querySelectorAll('tr');
            if (rows.length === 0) return;
            
            const cols = rows[0].querySelectorAll('th, td').length;
            const colWidth = maxWidth / cols;
            
            currentY += 10;
            
            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('th, td');
                const isHeader = row.querySelector('th') !== null;
                
                checkPageBreak(15);
                
                if (isHeader) {
                    pdf.setFillColor(250, 249, 248);
                    pdf.rect(margin, currentY - 3, maxWidth, 12, 'F');
                }
                
                cells.forEach((cell, colIndex) => {
                    const x = margin + (colIndex * colWidth);
                    pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
                    pdf.setFontSize(10);
                    pdf.setTextColor(50, 49, 48);
                    
                    const cellText = pdf.splitTextToSize(cell.textContent, colWidth - 4);
                    pdf.text(cellText[0] || '', x + 2, currentY + 5);
                    
                    // Bordes
                    pdf.setDrawColor(210, 208, 206);
                    pdf.rect(x, currentY - 3, colWidth, 12);
                });
                
                currentY += 12;
            });
            
            currentY += 5;
        }

        const elements = Array.from(tempDiv.children);
        console.log(`Total de elementos a procesar: ${elements.length}`);
        
        for (let i = 0; i < elements.length; i++) {
            console.log(`Procesando elemento ${i + 1}/${elements.length}: ${elements[i].tagName}`);
            await processElement(elements[i]);
        }

        pdf.setProperties({
            title: filename,
            creator: 'Editor Markdown',
            author: 'Usuario'
        });

        pdf.save(`${filename}.pdf`);
        console.log('PDF descargado como:', `${filename}.pdf`);

    } catch (err) {
        console.error('Error al generar el PDF:', err);
        alert('Error al generar el PDF. Consulta la consola.');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function clearEditor() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el contenido?')) {
        markdownInput.value = '';
        updatePreview();
        console.log('Editor limpiado.');
    }
}

function insertExample() {
    markdownInput.value = `# Documento de Ejemplo

Este es un documento de ejemplo que muestra las capacidades del editor.

## Matemáticas

La famosa ecuación de Einstein: $E = mc^2$

Una integral importante:

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

## Formateo de texto

Puedes usar **texto en negrita** y *texto en cursiva*.

### Listas

- Elemento 1
- Elemento 2
- Elemento 3

### Código

\`\`\`javascript
function saludar(nombre) {
return \`Hola, \${nombre}!\`;
}
\`\`\`

### Cita

> "El límite fundamental del cálculo: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$"

### Tabla

| Función | Derivada |
|---------|----------|
| $x^2$ | $2x$ |
| $\\sin x$ | $\\cos x$ |
| $e^x$ | $e^x$ |`;
    updatePreview();
    console.log('Ejemplo insertado.');
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.MathJax && window.MathJax.startup) {
        window.MathJax.startup.promise.then(() => {
            console.log('MathJax cargado. Renderizando vista previa inicial...');
            updatePreview();
        });
    } else {
        updatePreview();
    }
});