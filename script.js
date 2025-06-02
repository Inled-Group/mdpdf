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
let markdownInput, preview, filenameInput, loading, wordCount;

// Inicialización cuando el DOM esté listo
function initializeElements() {
    markdownInput = document.getElementById('markdown-input');
    preview = document.getElementById('preview');
    filenameInput = document.getElementById('filename');
    loading = document.getElementById('loading');
    wordCount = document.getElementById('word-count');
    
    if (markdownInput && preview) {
        markdownInput.addEventListener('input', updatePreview);
        console.log('Elementos inicializados correctamente');
    } else {
        console.error('Error: No se pudieron encontrar los elementos del DOM');
    }
}

// Configurar marked
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false
    });
}

// Procesar LaTeX y marcarlo para MathJax
function processLatex(html) {
    console.log('Procesando LaTeX...');
    // Procesar matemáticas en bloque primero
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, function(match, content) {
        return '<div class="math-display" data-math="' + content.trim() + '">$$' + content + '$$</div>';
    });
    // Procesar matemáticas en línea
    html = html.replace(/\$([^$\r\n]*?[^$\s][^$\r\n]*?)\$/g, function(match, content) {
        return '<span class="math-inline" data-math="' + content.trim() + '">$' + content + '$</span>';
    });
    return html;
}

// Convertir LaTeX a imagen PNG usando MathJax con mayor resolución
async function latexToImageDataUrl(latex, display = true) {
    try {
        if (!window.MathJax || !window.MathJax.tex2svg) {
            console.error('MathJax no está disponible');
            return null;
        }
        
        const svg = MathJax.tex2svg(latex, { display });
        const svgElement = svg.querySelector('svg');
        svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        const svgString = new XMLSerializer().serializeToString(svgElement);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const scale = 3;
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.scale(scale, scale);
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    console.error('Error convirtiendo SVG a canvas:', error);
                    reject(error);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('No se pudo cargar la imagen SVG'));
            };
            img.src = url;
        });
    } catch (error) {
        console.error('Error en latexToImageDataUrl:', error);
        return null;
    }
}

// Actualiza la vista previa y contador de palabras
function updatePreview() {
    if (!markdownInput || !preview) {
        console.error('Elementos no inicializados');
        return;
    }
    
    const markdownText = markdownInput.value;
    let html = marked ? marked.parse(markdownText) : markdownText;
    html = processLatex(html);
    preview.innerHTML = html;
    
    // Actualizar contador de palabras
    if (wordCount) {
        const words = markdownText.trim().split(/\s+/).filter(word => word.length > 0);
        wordCount.textContent = `${words.length} palabras`;
    }
    
    // Renderizar MathJax si está disponible
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([preview]).then(() => {
            console.log('MathJax renderizado completado.');
        }).catch(err => {
            console.error('Error en MathJax:', err.message);
        });
    }
}

// Clase para manejar texto con diferentes estilos sin saltos de línea
class TextRenderer {
    constructor(pdf, x, y, maxWidth, fontSize = 11) {
        this.pdf = pdf;
        this.currentX = x;
        this.currentY = y;
        this.maxWidth = maxWidth;
        this.fontSize = fontSize;
        this.lineHeight = fontSize * 1.2;
        this.spaceWidth = pdf.getTextWidth(' ');
        this.startX = x;
    }

    // Añadir texto con estilo específico
    addText(text, style = 'normal', color = [0, 0, 0]) {
        if (!text) return;
        
        this.pdf.setFontSize(this.fontSize);
        this.pdf.setFont('helvetica', style);
        this.pdf.setTextColor(...color);
        
        const words = text.split(' ');
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordWidth = this.pdf.getTextWidth(word);
            
            // Verificar si la palabra cabe en la línea actual
            if (this.currentX + wordWidth > this.maxWidth) {
                this.newLine();
            }
            
            // Añadir la palabra
            this.pdf.text(word, this.currentX, this.currentY);
            this.currentX += wordWidth;
            
            // Añadir espacio después de la palabra (excepto la última)
            if (i < words.length - 1) {
                this.currentX += this.spaceWidth;
            }
        }
    }

    // Añadir imagen LaTeX inline
    async addLatexImage(latex) {
        const imgData = await latexToImageDataUrl(latex, false);
        if (imgData) {
            const imgWidth = 20;
            const imgHeight = 8;
            
            // Verificar si la imagen cabe en la línea
            if (this.currentX + imgWidth > this.maxWidth) {
                this.newLine();
            }
            
            this.pdf.addImage(imgData, 'PNG', this.currentX, this.currentY - 6, imgWidth, imgHeight);
            this.currentX += imgWidth + 2;
        }
    }

    // Nueva línea
    newLine() {
        this.currentX = this.startX;
        this.currentY += this.lineHeight;
    }

    // Obtener posición Y actual
    getCurrentY() {
        return this.currentY;
    }

    // Añadir espacio adicional
    addSpace() {
        this.currentX += this.spaceWidth;
    }
}

// Procesar contenido inline de manera recursiva para LaTeX anidado
async function processInlineContentRecursive(element, textRenderer) {
    const childNodes = Array.from(element.childNodes);
    
    for (let node of childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            textRenderer.addText(node.textContent, 'normal', [0, 0, 0]);
        } else if (node.tagName === 'STRONG' || node.tagName === 'B') {
            // Procesar contenido dentro del elemento strong recursivamente
            await processInlineContentRecursive(node, {
                ...textRenderer,
                addText: (text, _, color) => textRenderer.addText(text, 'bold', color),
                addLatexImage: textRenderer.addLatexImage.bind(textRenderer)
            });
        } else if (node.tagName === 'EM' || node.tagName === 'I') {
            // Procesar contenido dentro del elemento em recursivamente
            await processInlineContentRecursive(node, {
                ...textRenderer,
                addText: (text, _, color) => textRenderer.addText(text, 'italic', color),
                addLatexImage: textRenderer.addLatexImage.bind(textRenderer)
            });
        } else if (node.tagName === 'CODE') {
            // Fondo gris para código inline
            const codeText = node.textContent;
            const codeWidth = textRenderer.pdf.getTextWidth(codeText) + 4;
            
            if (textRenderer.currentX + codeWidth > textRenderer.maxWidth) {
                textRenderer.newLine();
            }
            
            textRenderer.pdf.setFillColor(240, 240, 240);
            textRenderer.pdf.rect(textRenderer.currentX, textRenderer.currentY - 4, codeWidth, 8, 'F');
            textRenderer.addText(codeText, 'normal', [150, 0, 0]);
        } else if (node.tagName === 'SPAN' && node.classList.contains('math-inline')) {
            const latex = node.getAttribute('data-math');
            if (latex) {
                await textRenderer.addLatexImage(latex);
            }
        } else if (node.tagName === 'A') {
            textRenderer.addText(node.textContent, 'normal', [0, 120, 212]);
        } else {
            // Para otros elementos, procesar recursivamente
            await processInlineContentRecursive(node, textRenderer);
        }
    }
}

// Genera el PDF con fórmulas como imágenes
async function downloadPDF() {
    if (!preview) {
        console.error('Preview no disponible');
        alert('Error: Preview no disponible');
        return;
    }
    
    const filename = (filenameInput ? filenameInput.value.trim() : '') || 'documento';
    
    if (loading) loading.style.display = 'block';
    console.log('Iniciando generación de PDF...');

    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('jsPDF no está disponible');
        }
        
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = preview.innerHTML;
        
        let currentY = 20;
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);

        function checkPageBreak(neededHeight) {
            if (currentY + neededHeight > pageHeight - margin) {
                pdf.addPage();
                currentY = 20;
                console.log('Salto de página agregado');
            }
        }

        function addSimpleText(text, fontSize, fontStyle, color = [0, 0, 0], indent = 0) {
            if (!text.trim()) return;
            
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', fontStyle);
            pdf.setTextColor(...color);
            const lines = pdf.splitTextToSize(text.trim(), maxWidth - indent);
            const lineHeight = fontSize * 1.2;
            const neededHeight = lines.length * lineHeight;
            checkPageBreak(neededHeight);
            
            lines.forEach(line => {
                pdf.text(line, margin + indent, currentY);
                currentY += lineHeight;
            });
            currentY += 3;
        }

        async function processElement(element) {
            const tag = element.tagName.toLowerCase();
            console.log('Procesando elemento:', tag);

            try {
                if (tag === 'h1') {
                    currentY += 10;
                    addSimpleText(element.textContent, 20, 'bold', [0, 0, 0]);
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineWidth(0.5);
                    pdf.line(margin, currentY - 3, pageWidth - margin, currentY - 3);
                    currentY += 5;
                } else if (tag === 'h2') {
                    currentY += 8;
                    addSimpleText(element.textContent, 16, 'bold', [0, 0, 0]);
                    currentY += 3;
                } else if (tag === 'h3') {
                    currentY += 6;
                    addSimpleText(element.textContent, 14, 'bold', [50, 50, 50]);
                    currentY += 3;
                } else if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
                    currentY += 4;
                    addSimpleText(element.textContent, 12, 'bold', [100, 100, 100]);
                    currentY += 2;
                } else if (tag === 'p') {
                    // Usar TextRenderer para párrafos con contenido mixto
                    checkPageBreak(20);
                    const textRenderer = new TextRenderer(pdf, margin, currentY, margin + maxWidth, 11);
                    await processInlineContentRecursive(element, textRenderer);
                    currentY = textRenderer.getCurrentY() + 8;
                } else if (tag === 'div' && element.classList.contains('math-display')) {
                    const latex = element.getAttribute('data-math');
                    if (latex) {
                        console.log('Procesando fórmula en bloque:', latex);
                        const imgData = await latexToImageDataUrl(latex, true);
                        if (imgData) {
                            checkPageBreak(40);
                            const imgWidth = 120;
                            const imgX = (pageWidth - imgWidth) / 2;
                            pdf.addImage(imgData, 'PNG', imgX, currentY, imgWidth, 25);
                            currentY += 35;
                        }
                    }
                } else if (tag === 'ul' || tag === 'ol') {
                    await processList(element, tag === 'ol');
                } else if (tag === 'blockquote') {
                    currentY += 5;
                    // Configurar el color azul para la línea
                    pdf.setDrawColor(0, 120, 212);
                    pdf.setLineWidth(2);
                    
                    // Calcular altura necesaria para la cita
                    const quoteHeight = Math.max(20, pdf.splitTextToSize(element.textContent, maxWidth - 15).length * 12);
                    checkPageBreak(quoteHeight + 10);
                    
                    // Dibujar línea azul vertical
                    pdf.line(margin, currentY, margin, currentY + quoteHeight);
                    
                    // Usar TextRenderer para el contenido de la cita
                    const textRenderer = new TextRenderer(pdf, margin + 10, currentY + 12, margin + maxWidth - 10, 11);
                    await processInlineContentRecursive(element, {
                        ...textRenderer,
                        addText: (text, style, _) => textRenderer.addText(text, 'italic', [100, 100, 100]),
                        addLatexImage: textRenderer.addLatexImage.bind(textRenderer)
                    });
                    currentY = textRenderer.getCurrentY() + 10;
                } else if (tag === 'pre') {
                    await processCodeBlock(element);
                } else if (tag === 'table') {
                    await processTable(element);
                }
            } catch (error) {
                console.error(`Error procesando elemento ${tag}:`, error);
            }
        }

        async function processList(listElement, isOrdered) {
            const items = listElement.querySelectorAll('li');
            for (let i = 0; i < items.length; i++) {
                const bullet = isOrdered ? `${i + 1}.` : '•';
                checkPageBreak(20);
                
                // Añadir bullet
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(0, 0, 0);
                pdf.text(bullet, margin + 5, currentY);
                
                // Procesar contenido del item
                const textRenderer = new TextRenderer(pdf, margin + 15, currentY, margin + maxWidth - 15, 11);
                await processInlineContentRecursive(items[i], textRenderer);
                currentY = textRenderer.getCurrentY() + 5;
            }
            currentY += 5;
        }

        async function processCodeBlock(preElement) {
            const code = preElement.textContent;
            currentY += 5;
            
            // CORREGIDO: Fondo gris claro en lugar de negro
            pdf.setFillColor(248, 248, 248);
            const lines = code.split('\n');
            const blockHeight = lines.length * 5 + 10;
            checkPageBreak(blockHeight);
            pdf.rect(margin, currentY - 5, maxWidth, blockHeight, 'F');
            
            // CORREGIDO: Bordes del bloque de código
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.5);
            pdf.rect(margin, currentY - 5, maxWidth, blockHeight);
            
            pdf.setFont('courier', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(0, 0, 0);
            
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
            
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                const cells = row.querySelectorAll('th, td');
                const isHeader = row.querySelector('th') !== null;
                
                checkPageBreak(25);
                
                const rowStartY = currentY;
                let maxCellHeight = 15;
                
                // Primero, procesamos todas las celdas para calcular la altura máxima
                const cellContents = [];
                for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                    const cell = cells[colIndex];
                    
                    // Crear un TextRenderer temporal para medir el contenido
                    const tempRenderer = new TextRenderer(pdf, 0, 0, colWidth - 4, 10);
                    const originalY = tempRenderer.getCurrentY();
                    
                    // Procesar contenido para medir altura sin renderizar
                    await processInlineContentForMeasurement(cell, tempRenderer);
                    const cellHeight = tempRenderer.getCurrentY() - originalY + 10;
                    maxCellHeight = Math.max(maxCellHeight, cellHeight);
                    
                    // Guardar el contenido para renderizar después
                    cellContents.push({
                        element: cell,
                        height: cellHeight
                    });
                }
                
                // Dibujar fondo de header si es necesario
                if (isHeader) {
                    pdf.setFillColor(240, 240, 240);
                    pdf.rect(margin, rowStartY, maxWidth, maxCellHeight, 'F');
                }
                
                // Ahora renderizamos todas las celdas con la altura conocida
                for (let colIndex = 0; colIndex < cells.length; colIndex++) {
                    const x = margin + (colIndex * colWidth);
                    const cellContent = cellContents[colIndex];
                    
                    // Crear TextRenderer para la celda en la posición correcta
                    const cellRenderer = new TextRenderer(pdf, x + 2, rowStartY + 10, colWidth - 4, 10);
                    await processInlineContentRecursive(cellContent.element, cellRenderer);
                    
                    // Dibujar bordes de la celda
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineWidth(0.5);
                    pdf.rect(x, rowStartY, colWidth, maxCellHeight);
                }
                
                currentY = rowStartY + maxCellHeight;
            }
            
            currentY += 5;
        }

        // Función auxiliar para medir contenido sin renderizar
        async function processInlineContentForMeasurement(element, textRenderer) {
            const childNodes = Array.from(element.childNodes);
            
            for (let node of childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    if (text.trim()) {
                        // Simular el ancho del texto sin renderizar
                        const words = text.split(' ');
                        for (let word of words) {
                            const wordWidth = textRenderer.pdf.getTextWidth(word);
                            if (textRenderer.currentX + wordWidth > textRenderer.maxWidth) {
                                textRenderer.newLine();
                            }
                            textRenderer.currentX += wordWidth + textRenderer.spaceWidth;
                        }
                    }
                } else if (node.tagName === 'SPAN' && node.classList.contains('math-inline')) {
                    // Para fórmulas LaTeX inline, simular un ancho aproximado
                    const latexWidth = 20;
                    if (textRenderer.currentX + latexWidth > textRenderer.maxWidth) {
                        textRenderer.newLine();
                    }
                    textRenderer.currentX += latexWidth + 2;
                } else if (node.tagName === 'STRONG' || node.tagName === 'B' || 
                          node.tagName === 'EM' || node.tagName === 'I' ||
                          node.tagName === 'CODE' || node.tagName === 'A') {
                    // Procesar recursivamente elementos con formato
                    await processInlineContentForMeasurement(node, textRenderer);
                }
            }
        }

        // Procesar todos los elementos
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
        alert(`Error al generar el PDF: ${err.message}`);
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function clearEditor() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el contenido?')) {
        if (markdownInput) {
            markdownInput.value = '';
            updatePreview();
            console.log('Editor limpiado.');
        }
    }
}

function insertExample() {
    if (!markdownInput) {
        console.error('markdownInput no está disponible');
        return;
    }
    
    const exampleContent = `# Documento de Ejemplo

Este es un documento de ejemplo que muestra las capacidades del editor.

## Matemáticas

La famosa ecuación de Einstein: $E = mc^2$

Una integral importante:

$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

## Formateo de texto

Puedes usar **texto en negrita** y *texto en cursiva*.

También puedes combinar **negrita con $x^2 + y^2 = z^2$ matemáticas** en la misma línea.

### Listas

- Elemento con $\\alpha + \\beta = \\gamma$
- **Elemento en negrita** con $\\int x dx = \\frac{x^2}{2}$
- *Elemento en cursiva* normal

### Código

\`\`\`javascript
function saludar(nombre) {
    return \`Hola, \${nombre}!\`;
}
\`\`\`

También puedes usar código inline como \`console.log()\` en el texto.

### Cita

> "El límite fundamental del cálculo: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$"

### Tabla

| Función | Derivada | Integral |
|---------|----------|----------|
| $x^2$ | $2x$ | $\\frac{x^3}{3}$ |
| $\\sin x$ | $\\cos x$ | $-\\cos x$ |
| $e^x$ | $e^x$ | $e^x$ |

### Texto mixto

Este párrafo combina **texto en negrita**, *texto en cursiva*, $\\frac{1}{2}$ matemáticas inline, y \`código\` todo en la misma línea sin saltos innecesarios.`;

    markdownInput.value = exampleContent;
    updatePreview();
    console.log('Ejemplo insertado.');
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando...');
    initializeElements();
    
    if (window.MathJax && window.MathJax.startup) {
        window.MathJax.startup.promise.then(() => {
            console.log('MathJax cargado. Renderizando vista previa inicial...');
            updatePreview();
        }).catch(err => {
            console.error('Error cargando MathJax:', err);
            updatePreview();
        });
    } else {
        setTimeout(() => {
            updatePreview();
        }, 100);
    }
});

// Exponer funciones globalmente
window.downloadPDF = downloadPDF;
window.clearEditor = clearEditor;
window.insertExample = insertExample;