// Configurar MathJax
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

let markdownInput, preview, filenameInput, loading, wordCount;

document.addEventListener('DOMContentLoaded', () => {
  markdownInput = document.getElementById('markdown-input');
  preview = document.getElementById('preview');
  filenameInput = document.getElementById('filename');
  loading = document.getElementById('loading');
  wordCount = document.getElementById('word-count');

  if (markdownInput && preview) {
    markdownInput.addEventListener('input', updatePreview);
    updatePreview();
  }

  if (window.MathJax && window.MathJax.startup) {
    window.MathJax.startup.promise.then(() => updatePreview());
  }
});

function updatePreview() {
  if (!markdownInput || !preview) return;
  const text = markdownInput.value;
  let html = marked.parse(text);
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => `<div class="math-display" data-math="${math}">$$${math}$$</div>`);
  html = html.replace(/\$([^\$]+?)\$/g, (_, math) => `<span class="math-inline" data-math="${math}">$${math}$</span>`);
  preview.innerHTML = html;

  if (wordCount) {
    const words = text.trim().split(/\s+/).filter(w => w);
    wordCount.textContent = `${words.length} palabras`;
  }

  if (window.MathJax && window.MathJax.typesetPromise) {
    MathJax.typesetPromise([preview]);
  }
}

function insertExample() {
  if (!markdownInput) return;
  markdownInput.value = `# Encabezados

# Encabezado 1
## Encabezado 2
### Encabezado 3
#### Encabezado 4
##### Encabezado 5
###### Encabezado 6

---

# Énfasis

Texto en *cursiva*, _también cursiva_  
Texto en **negrita**, __también negrita__  
Texto en ***negrita y cursiva***  
Texto ~~tachado~~

---

# Listas

## Lista desordenada
- Elemento 1
  - Sub-elemento 1.1
  - Sub-elemento 1.2
- Elemento 2
* Alternativa con asterisco
+ Otra alternativa

## Lista ordenada
1. Primer punto
2. Segundo punto
   1. Subpunto
   2. Otro subpunto
3. Tercer punto

---

# Citas

> Esto es una cita
>> Esto es una cita anidada

---

# Código

Texto en línea con \`código\`.

Bloque de código:

\`\`\`python
def saludar():
    print("¡Hola mundo!")
\`\`\`

Bloque con lenguaje indicado (\`bash\`):

\`\`\`bash
echo "Hola mundo"
\`\`\`

---

# Enlaces

[Texto del enlace](https://www.ejemplo.com)  
<https://www.google.com>  
[Enlace con título](https://www.ejemplo.com "Título opcional")

---

# Imágenes

![Texto alternativo](https://via.placeholder.com/150)  
![Imagen con título](https://via.placeholder.com/100 "Título de imagen")

---

# Tablas

| Nombre    | Edad | Ciudad     |
|-----------|------|------------|
| Ana       | 23   | Madrid     |
| Luis      | 31   | Barcelona  |
| Carolina  | 28   | Valencia   |

Tabla alineada:

| Izquierda | Centro | Derecha |
|:----------|:------:|--------:|
| Uno       | Dos    | Tres    |
| Cuatro    | Cinco  | Seis    |

---

# Línea horizontal

---

# HTML incrustado

<p style="color:red">Esto es HTML embebido en Markdown</p>

---

# Tareas

- [x] Elemento completado
- [ ] Elemento pendiente

---

# Caracteres escapados

\\*Asterisco\\*  
\\_Guion bajo\\_  
\\# Almohadilla  
\\\`Comillas invertidas\`

---

# Emoji (si el convertidor lo soporta)

:sparkles: :tada: :rocket: :coffee:

---

# Fórmulas LaTeX (si tu editor o conversor lo permite)

Inline: \$E = mc^2\$  
Bloque:

\$\$
\\int_{a}^{b} x^2 dx = \\frac{b^3 - a^3}{3}
\$\$

---

# Referencias de enlace

Este es un [enlace de referencia][google].

[google]: https://www.google.com

---

# Saltos de línea

Primera línea  
Segunda línea (con dos espacios al final)  
Tercera línea (con línea nueva)

---

# Encabezado con anclas (GitHub)

### Esto es un encabezado con ancla <a name="ancla-ejemplo"></a>

Puedes referenciarlo [aquí](#ancla-ejemplo)

---

# Comentarios HTML

<!-- Esto es un comentario y no debe aparecer en el PDF -->

---

# Fin del documento

Gracias por usar este test de Markdown ✅`;

  updatePreview();
}

function clearEditor() {
  if (!markdownInput) return;
  if (confirm('¿Seguro que quieres borrar todo?')) {
    markdownInput.value = '';
    updatePreview();
  }
}

async function latexToImageDataUrl(latex, display = true) {
    if (!window.MathJax || !window.MathJax.tex2svg) return null;
    
    const svg = MathJax.tex2svg(latex, { display });
    const svgElement = svg.querySelector('svg');
    if (!svgElement) return null;
    
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    
    // Obtener dimensiones reales del SVG
    const bbox = svgElement.getBBox();
    const actualWidth = bbox.width;
    const actualHeight = bbox.height;
    
    // Ajustar el viewBox para que coincida con el contenido
    svgElement.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${actualWidth} ${actualHeight}`);
    svgElement.setAttribute("width", actualWidth.toString());
    svgElement.setAttribute("height", actualHeight.toString());
  
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
  
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 3; // Mayor escala para mejor calidad
        canvas.width = actualWidth * scale;
        canvas.height = actualHeight * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, actualWidth, actualHeight);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: actualWidth,
          height: actualHeight
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo cargar la imagen"));
      };
      img.src = url;
    });
}

// Función para obtener estilos computados de un elemento
function getComputedStyles(el) {
  const styles = window.getComputedStyle(el);
  return {
    fontSize: parseFloat(styles.fontSize),
    fontWeight: styles.fontWeight,
    fontStyle: styles.fontStyle,
    color: styles.color,
    marginTop: parseFloat(styles.marginTop),
    marginBottom: parseFloat(styles.marginBottom),
    marginLeft: parseFloat(styles.marginLeft),
    paddingTop: parseFloat(styles.paddingTop),
    paddingBottom: parseFloat(styles.paddingBottom),
    lineHeight: parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2
  };
}

// Función para convertir color RGB a array
function rgbToArray(rgbString) {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
}

class AdvancedTextRenderer {
  constructor(pdf, startX, startY, maxWidth) {
    this.pdf = pdf;
    this.startX = startX;
    this.currentX = startX;
    this.currentY = startY;
    this.maxWidth = maxWidth;
    this.spaceWidth = 0;
  }

  setFont(fontSize, fontWeight = 'normal', fontStyle = 'normal') {
    this.pdf.setFontSize(fontSize);
    
    let fontName = 'helvetica';
    let fontType = 'normal';
    
    if (fontWeight === 'bold' || fontWeight === '700' || fontWeight === 'bolder') {
      fontType = 'bold';
    }
    if (fontStyle === 'italic') {
      fontType = fontType === 'bold' ? 'bolditalic' : 'italic';
    }
    
    this.pdf.setFont(fontName, fontType);
    this.spaceWidth = this.pdf.getTextWidth(' ');
  }

  async addInlineContent(element) {
    const childNodes = Array.from(element.childNodes);
    
    for (let node of childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) {
          this.addText(text);
        }
      }
      else if (node.nodeType === Node.ELEMENT_NODE) {
        await this.processElement(node);
      }
    }
  }

  async processElement(element) {
    const tag = element.tagName.toLowerCase();
    
    switch (tag) {
      case 'strong':
      case 'b':
        await this.addStyledText(element, { fontWeight: 'bold' });
        break;
      case 'em':
      case 'i':
        await this.addStyledText(element, { fontStyle: 'italic' });
        break;
      case 'code':
        await this.addCodeText(element);
        break;
      case 'a':
        await this.addStyledText(element, { color: [0, 102, 204] });
        break;
      case 'span':
        if (element.classList.contains('math-inline')) {
          await this.addMathInline(element);
        } else {
          await this.addInlineContent(element);
        }
        break;
      default:
        await this.addInlineContent(element);
    }
  }

  async addStyledText(element, styles) {
    const currentFont = this.pdf.internal.getFont();
    const currentSize = this.pdf.internal.getFontSize();
    const currentColor = this.pdf.internal.getTextColor();
    
    if (styles.fontWeight === 'bold') {
      this.pdf.setFont(currentFont.fontName, 'bold');
    }
    if (styles.fontStyle === 'italic') {
      const fontType = styles.fontWeight === 'bold' ? 'bolditalic' : 'italic';
      this.pdf.setFont(currentFont.fontName, fontType);
    }
    if (styles.color) {
      this.pdf.setTextColor(...styles.color);
    }
    
    await this.addInlineContent(element);
    
    // Restaurar estilos
    this.pdf.setFont(currentFont.fontName, currentFont.fontStyle);
    this.pdf.setFontSize(currentSize);
    this.pdf.setTextColor(currentColor);
  }

  async addCodeText(element) {
    const text = element.textContent;
    const padding = 1;
    const maxCodeWidth = this.maxWidth - this.currentX;
    
    // Si el código es muy largo, dividirlo
    const textWidth = this.pdf.getTextWidth(text);
    
    if (textWidth + padding * 2 > maxCodeWidth) {
      // Código muy largo, dividir por palabras o caracteres
      let parts = [];
      if (text.includes(' ')) {
        // Dividir por palabras
        const words = text.split(' ');
        let currentPart = '';
        
        for (let word of words) {
          const testPart = currentPart ? currentPart + ' ' + word : word;
          if (this.pdf.getTextWidth(testPart) + padding * 2 <= maxCodeWidth) {
            currentPart = testPart;
          } else {
            if (currentPart) {
              parts.push(currentPart);
              currentPart = word;
            } else {
              // Palabra muy larga, dividir por caracteres
              let charPart = '';
              for (let char of word) {
                if (this.pdf.getTextWidth(charPart + char) + padding * 2 <= maxCodeWidth) {
                  charPart += char;
                } else {
                  if (charPart) parts.push(charPart);
                  charPart = char;
                }
              }
              if (charPart) currentPart = charPart;
            }
          }
        }
        if (currentPart) parts.push(currentPart);
      } else {
        // Dividir por caracteres
        let charPart = '';
        for (let char of text) {
          if (this.pdf.getTextWidth(charPart + char) + padding * 2 <= maxCodeWidth) {
            charPart += char;
          } else {
            if (charPart) parts.push(charPart);
            charPart = char;
          }
        }
        if (charPart) parts.push(charPart);
      }
      
      // Renderizar cada parte
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const partWidth = this.pdf.getTextWidth(part) + padding * 2;
        
        if (this.currentX + partWidth > this.maxWidth) {
          this.newLine();
        }
        
        // Fondo gris para el código
        this.pdf.setFillColor(245, 245, 245);
        this.pdf.rect(this.currentX, this.currentY - 3, partWidth, 8, 'F');
        
        // Texto del código en color rojo
        const originalColor = this.pdf.internal.getTextColor();
        this.pdf.setTextColor(220, 50, 47);
        this.pdf.text(part, this.currentX + padding, this.currentY);
        this.pdf.setTextColor(originalColor);
        
        this.currentX += partWidth;
        
        if (i < parts.length - 1) {
          // Si hay más partes, saltar línea
          this.newLine();
        }
      }
    } else {
      // Código corto, renderizado normal
      if (this.currentX + textWidth + padding * 2 > this.maxWidth) {
        this.newLine();
      }
      
      // Fondo gris para el código
      this.pdf.setFillColor(245, 245, 245);
      this.pdf.rect(this.currentX, this.currentY - 3, textWidth + padding * 2, 8, 'F');
      
      // Texto del código en color rojo
      const originalColor = this.pdf.internal.getTextColor();
      this.pdf.setTextColor(220, 50, 47);
      this.pdf.text(text, this.currentX + padding, this.currentY);
      this.pdf.setTextColor(originalColor);
      
      this.currentX += textWidth + padding * 2;
    }
  }

  async addMathInline(element) {
    const latex = element.getAttribute('data-math');
    if (!latex) return;
    
    try {
      const mathImg = await latexToImageDataUrl(latex, false);
      if (mathImg) {
        const scale = 0.6; // Escalar las matemáticas inline
        const imgWidth = mathImg.width * scale;
        const imgHeight = mathImg.height * scale;
        
        if (this.currentX + imgWidth > this.maxWidth) {
          this.newLine();
        }
        
        // Centrar verticalmente la imagen matemática
        const yOffset = (this.pdf.internal.getFontSize() - imgHeight) / 2;
        this.pdf.addImage(mathImg.dataUrl, 'PNG', this.currentX, this.currentY - imgHeight + yOffset, imgWidth, imgHeight);
        this.currentX += imgWidth + 1;
      }
    } catch (error) {
      console.error('Error procesando matemáticas inline:', error);
      // Fallback: mostrar el texto LaTeX
      this.addText(`$${latex}$`);
    }
  }

  addText(text) {
    // Soporte para emojis - convertir texto a array de caracteres Unicode
    const characters = Array.from(text);
    let currentWord = '';
    
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      
      // Si es un espacio o llegamos al final
      if (/\s/.test(char) || i === characters.length - 1) {
        if (!/\s/.test(char)) {
          currentWord += char; // Agregar el último character si no es espacio
        }
        
        if (currentWord) {
          // Verificar si la palabra cabe en la línea actual
          const wordWidth = this.getTextWidth(currentWord);
          
          if (this.currentX + wordWidth > this.maxWidth && this.currentX > this.startX) {
            this.newLine();
          }
          
          // Renderizar palabra con soporte de emojis
          this.renderTextWithEmojis(currentWord, this.currentX, this.currentY);
          this.currentX += wordWidth;
          currentWord = '';
        }
        
        // Agregar espacio si es necesario
        if (/\s/.test(char)) {
          this.currentX += this.spaceWidth;
        }
      } else {
        currentWord += char;
      }
    }
  }
  
  getTextWidth(text) {
    // Medición mejorada que considera emojis
    try {
      return this.pdf.getTextWidth(text);
    } catch (error) {
      // Fallback para caracteres problemáticos
      return text.length * (this.pdf.internal.getFontSize() * 0.6);
    }
  }
  
  renderTextWithEmojis(text, x, y) {
    try {
      // Intentar renderizado normal primero
      this.pdf.text(text, x, y);
    } catch (error) {
      // Si falla (probablemente por emojis), renderizar character por character
      let currentX = x;
      const fontSize = this.pdf.internal.getFontSize();
      
      for (let char of Array.from(text)) {
        try {
          this.pdf.text(char, currentX, y);
          currentX += this.pdf.getTextWidth(char);
        } catch (charError) {
          // Para emojis que no se pueden renderizar, usar un placeholder
          const placeholder = '□';
          this.pdf.text(placeholder, currentX, y);
          currentX += this.pdf.getTextWidth(placeholder);
        }
      }
    }
  }

  newLine(extraSpacing = 0) {
    this.currentX = this.startX;
    this.currentY += this.pdf.internal.getFontSize() * 1.2 + extraSpacing;
  }

  getCurrentY() {
    return this.currentY;
  }

  addSpacing(spacing) {
    this.currentY += spacing;
  }
}

window.insertExample = insertExample;
window.clearEditor = clearEditor;
window.downloadPDF = async function downloadPDF() {
  if (!preview) return;
  
  const filename = filenameInput?.value?.trim() || "documento";
  if (loading) loading.style.display = 'block';
  
  try {
    const pdf = new jspdf.jsPDF("p", "mm", "a4");
    const margin = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const maxWidth = pageWidth - margin * 2;
    let currentY = margin;
    
    // Crear una copia del contenido para procesar
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = preview.innerHTML;
    const elements = Array.from(tempDiv.children);
    
    for (let element of elements) {
      const tag = element.tagName.toLowerCase();
      
      // Verificar si necesitamos nueva página
      if (currentY > pageHeight - margin - 50) {
        pdf.addPage();
        currentY = margin;
      }
      
      switch (tag) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          currentY = await processHeading(pdf, element, margin, currentY, maxWidth);
          break;
          
        case 'p':
          currentY = await processParagraph(pdf, element, margin, currentY, maxWidth);
          break;
          
        case 'ul':
        case 'ol':
          currentY = await processList(pdf, element, margin, currentY, maxWidth);
          break;
          
        case 'table':
          currentY = await processTable(pdf, element, currentY, maxWidth);
          break;
          
        case 'pre':
          currentY = await processCodeBlock(pdf, element, margin, currentY, maxWidth);
          break;
          
        case 'blockquote':
          currentY = await processBlockquote(pdf, element, margin, currentY, maxWidth);
          break;
          
        case 'hr':
          currentY = await processHorizontalRule(pdf, margin, currentY, maxWidth);
          break;
          
        case 'div':
          if (element.classList.contains('math-display')) {
            currentY = await processMathDisplay(pdf, element, margin, currentY, maxWidth);
          }
          break;
      }
    }
    
    pdf.save(`${filename}.pdf`);
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el PDF. Por favor, intenta de nuevo.');
  } finally {
    if (loading) loading.style.display = 'none';
  }
};

async function processHeading(pdf, element, margin, y, maxWidth) {
  const level = parseInt(element.tagName.charAt(1));
  const fontSize = [0, 24, 20, 16, 14, 12, 11][level] || 11;
  const marginTop = level === 1 ? 15 : 10;
  const marginBottom = 8;
  
  y += marginTop;
  
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  
  const text = element.textContent.trim();
  
  // Soporte para emojis en headings
  try {
    const lines = pdf.splitTextToSize(text, maxWidth);
    for (let line of lines) {
      renderTextWithEmojis(pdf, line, margin, y);
      y += fontSize * 0.8;
    }
  } catch (error) {
    // Fallback para texto con emojis problemáticos
    const lines = wrapTextManually(pdf, text, maxWidth, fontSize);
    for (let line of lines) {
      renderTextWithEmojis(pdf, line, margin, y);
      y += fontSize * 0.8;
    }
  }
  
  return y + marginBottom;
}

function renderTextWithEmojis(pdf, text, x, y) {
  try {
    pdf.text(text, x, y);
  } catch (error) {
    // Renderizar character por character para manejar emojis
    let currentX = x;
    for (let char of Array.from(text)) {
      try {
        pdf.text(char, currentX, y);
        currentX += pdf.getTextWidth(char);
      } catch (charError) {
        // Placeholder para emojis no soportados
        const placeholder = '□';
        pdf.text(placeholder, currentX, y);
        currentX += pdf.getTextWidth(placeholder);
      }
    }
  }
}

function wrapTextManually(pdf, text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (let word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const testWidth = getTextWidthSafe(pdf, testLine);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Palabra muy larga, dividir
        lines.push(word);
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

function getTextWidthSafe(pdf, text) {
  try {
    return pdf.getTextWidth(text);
  } catch (error) {
    // Estimación para texto con emojis
    return Array.from(text).length * (pdf.internal.getFontSize() * 0.6);
  }
}

async function processParagraph(pdf, element, margin, y, maxWidth) {
  const renderer = new AdvancedTextRenderer(pdf, margin, y, margin + maxWidth);
  renderer.setFont(11, 'normal', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  await renderer.addInlineContent(element);
  
  return renderer.getCurrentY() + 10;
}

async function processList(pdf, element, margin, y, maxWidth) {
  const isOrdered = element.tagName.toLowerCase() === 'ol';
  const items = Array.from(element.querySelectorAll('li'));
  let itemNumber = 1;
  
  for (let item of items) {
    const renderer = new AdvancedTextRenderer(pdf, margin + 10, y, margin + maxWidth - 10);
    renderer.setFont(11, 'normal', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    // Dibujar el marcador
    if (isOrdered) {
      pdf.text(`${itemNumber}.`, margin, y);
      itemNumber++;
    } else {
      pdf.setFillColor(0, 0, 0);
      pdf.circle(margin + 3, y - 2, 1, 'F');
    }
    
    await renderer.addInlineContent(item);
    y = renderer.getCurrentY() + 5;
  }
  
  return y + 5;
}

async function processTable(pdf, element, y, maxWidth) {
  const rows = Array.from(element.querySelectorAll('tr'));
  const data = rows.map(row => 
    Array.from(row.children).map(cell => cell.textContent.trim())
  );
  
  if (data.length > 0) {
    pdf.autoTable({
      startY: y,
      head: [data[0]],
      body: data.slice(1),
      theme: 'grid',
      styles: { 
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold'
      }
    });
    
    return pdf.lastAutoTable.finalY + 10;
  }
  
  return y;
}

async function processCodeBlock(pdf, element, margin, y, maxWidth) {
  const code = element.textContent;
  const fontSize = 9;
  const lineHeight = fontSize * 1.3;
  const padding = 5;
  const codeMaxWidth = maxWidth - padding * 2;
  
  pdf.setFontSize(fontSize);
  pdf.setFont('courier', 'normal');
  
  // Dividir el código en líneas y luego ajustar cada línea al ancho
  const originalLines = code.split('\n');
  const wrappedLines = [];
  
  for (let line of originalLines) {
    if (pdf.getTextWidth(line) <= codeMaxWidth) {
      wrappedLines.push(line);
    } else {
      // Dividir línea larga en múltiples líneas
      const words = line.split(' ');
      let currentLine = '';
      
      for (let word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        
        if (pdf.getTextWidth(testLine) <= codeMaxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine);
            currentLine = word;
          } else {
            // Palabra muy larga, dividir por caracteres
            let charLine = '';
            for (let char of word) {
              if (pdf.getTextWidth(charLine + char) <= codeMaxWidth) {
                charLine += char;
              } else {
                if (charLine) wrappedLines.push(charLine);
                charLine = char;
              }
            }
            if (charLine) currentLine = charLine;
          }
        }
      }
      
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }
  }
  
  const blockHeight = wrappedLines.length * lineHeight + padding * 2;
  
  pdf.setFillColor(248, 248, 248);
  pdf.rect(margin, y, maxWidth, blockHeight, 'F');
  
  pdf.setTextColor(0, 0, 0);
  
  let currentY = y + padding + fontSize;
  for (let line of wrappedLines) {
    pdf.text(line, margin + padding, currentY);
    currentY += lineHeight;
  }
  
  return y + blockHeight + 10;
}

async function processBlockquote(pdf, element, margin, y, maxWidth) {
  const quoteMargin = 10;
  const renderer = new AdvancedTextRenderer(pdf, margin + quoteMargin, y, margin + maxWidth - quoteMargin);
  
  // Línea vertical de la cita
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(2);
  pdf.line(margin + 2, y, margin + 2, y + 20);
  
  renderer.setFont(11, 'normal', 'italic');
  pdf.setTextColor(100, 100, 100);
  
  await renderer.addInlineContent(element);
  
  return renderer.getCurrentY() + 10;
}

async function processHorizontalRule(pdf, margin, y, maxWidth) {
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 5, margin + maxWidth, y + 5);
  
  return y + 15;
}

async function processMathDisplay(pdf, element, margin, y, maxWidth) {
  const latex = element.getAttribute('data-math');
  if (!latex) return y;
  
  try {
    const mathImg = await latexToImageDataUrl(latex, true);
    if (mathImg) {
      const scale = 1.2;
      const imgWidth = Math.min(mathImg.width * scale, maxWidth);
      const imgHeight = mathImg.height * scale;
      
      // Centrar la imagen
      const imgX = margin + (maxWidth - imgWidth) / 2;
      
      pdf.addImage(mathImg.dataUrl, 'PNG', imgX, y, imgWidth, imgHeight);
      return y + imgHeight + 15;
    }
  } catch (error) {
    console.error('Error procesando matemáticas display:', error);
    // Fallback: mostrar el texto LaTeX
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`$$${latex}$$`, margin, y + 10);
    return y + 20;
  }
  
  return y;
}

// Exponer funciones globalmente
window.insertExample = insertExample;
window.clearEditor = clearEditor;
window.downloadPDF = downloadPDF;