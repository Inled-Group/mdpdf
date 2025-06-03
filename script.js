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
    markdownInput.value = `# Ejemplo\n\nTexto **negrita**, *cursiva*, \`código\`.\n\n$E = mc^2$\n\n$$\\int x dx = \\frac{x^2}{2}$$\n\n| Nombre | Edad |\n|--------|------|\n| Ana    | 30   |\n| Luis   | 25   |`;
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
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgElement.setAttribute("width", "150");
    svgElement.setAttribute("height", "40");
  
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
  
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo cargar la imagen"));
      };
      img.src = url;
    });
  }
  
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
  
    addText(text, style = 'normal', color = [0, 0, 0]) {
      if (!text) return;
      this.pdf.setFontSize(this.fontSize);
      this.pdf.setFont('helvetica', style);
      this.pdf.setTextColor(...color);
      const words = text.split(' ');
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordWidth = this.pdf.getTextWidth(word);
        if (this.currentX + wordWidth > this.maxWidth) {
          this.newLine();
        }
        this.pdf.text(word, this.currentX, this.currentY);
        this.currentX += wordWidth;
        if (i < words.length - 1) {
          this.currentX += this.spaceWidth;
        }
      }
    }
  
    async addLatexImage(latex) {
      const imgData = await latexToImageDataUrl(latex, false);
      if (imgData) {
        const imgWidth = 20;
        const imgHeight = 8;
        if (this.currentX + imgWidth > this.maxWidth) {
          this.newLine();
        }
        this.pdf.addImage(imgData, 'PNG', this.currentX, this.currentY - 6, imgWidth, imgHeight);
        this.currentX += imgWidth + 2;
      }
    }
  
    newLine() {
      this.currentX = this.startX;
      this.currentY += this.lineHeight;
    }
  
    getCurrentY() {
      return this.currentY;
    }
  }
  
  async function processInlineContentRecursive(element, textRenderer) {
    const childNodes = Array.from(element.childNodes);
  
    for (let node of childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text.trim()) {
          textRenderer.addText(text, 'normal', [0, 0, 0]);
        }
      }
  
      else if (node.tagName === 'STRONG' || node.tagName === 'B') {
        await processInlineContentRecursive(node, {
          ...textRenderer,
          addText: (text, _, color) => textRenderer.addText(text, 'bold', color),
          addLatexImage: textRenderer.addLatexImage.bind(textRenderer)
        });
      }
  
      else if (node.tagName === 'EM' || node.tagName === 'I') {
        await processInlineContentRecursive(node, {
          ...textRenderer,
          addText: (text, _, color) => textRenderer.addText(text, 'italic', color),
          addLatexImage: textRenderer.addLatexImage.bind(textRenderer)
        });
      }
  
      else if (node.tagName === 'CODE') {
        const codeText = node.textContent;
        const padding = 2;
        const textWidth = textRenderer.pdf.getTextWidth(codeText) + padding * 2;
        if (textRenderer.currentX + textWidth > textRenderer.maxWidth) {
          textRenderer.newLine();
        }
        textRenderer.pdf.setFillColor(240, 240, 240);
        textRenderer.pdf.rect(textRenderer.currentX, textRenderer.currentY - 4, textWidth, 9, 'F');
        textRenderer.addText(` ${codeText} `, 'normal', [150, 0, 0]);
      }
  
      else if (node.tagName === 'A') {
        await processInlineContentRecursive(node, {
          ...textRenderer,
          addText: (text, _, __) => textRenderer.addText(text, 'normal', [0, 102, 204]),
          addLatexImage: textRenderer.addLatexImage.bind(textRenderer)
        });
      }
  
      else if (node.tagName === 'SPAN' && node.classList.contains('math-inline')) {
        const latex = node.getAttribute('data-math');
        if (latex) {
          await textRenderer.addLatexImage(latex);
        }
      }
  
      else {
        await processInlineContentRecursive(node, textRenderer);
      }
    }
  }
  
  window.insertExample = insertExample;
  window.clearEditor = clearEditor;
  window.downloadPDF = async function downloadPDF() {
    if (!preview) return;
    const filename = filenameInput?.value?.trim() || "documento";
    if (loading) loading.style.display = 'block';
    const pdf = new jspdf.jsPDF("p", "mm", "a4");
    const margin = 20;
    const pageWidth = 210;
    const pageHeight = 297;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;
    const temp = document.createElement("div");
    temp.innerHTML = preview.innerHTML;
    const elements = temp.children;
  
    for (let el of elements) {
      const tag = el.tagName.toLowerCase();
  
      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const size = { h1: 20, h2: 16, h3: 14 }[tag];
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(el.textContent.replace(/ /g, '\u00A0'), maxWidth);
        for (let line of lines) {
          pdf.text(line, margin, y);
          y += size * 0.6 + 2;
        }
        y += 5;
      }
  
      else if (tag === "p") {
        const textRenderer = new TextRenderer(pdf, margin, y, margin + maxWidth, 11);
        await processInlineContentRecursive(el, textRenderer);
        y = textRenderer.getCurrentY() + 10;
      }
  
      else if (el.classList.contains("math-display")) {
        const latex = el.getAttribute("data-math");
        const img = await latexToImageDataUrl(latex);
        if (img) {
          const imgWidth = 120;
          const imgX = (pageWidth - imgWidth) / 2;
          pdf.addImage(img, "PNG", imgX, y, imgWidth, 25);
          y += 30;
        }
      }
  
      else if (tag === "table") {
        const rows = el.querySelectorAll("tr");
        const data = [...rows].map(r => [...r.children].map(c => c.textContent.trim()));
        pdf.autoTable({
          startY: y,
          head: [data[0]],
          body: data.slice(1),
          theme: 'grid',
          styles: { fontSize: 10 }
        });
        y = pdf.lastAutoTable.finalY + 10;
      }
  
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    }
  
    pdf.save(`${filename}.pdf`);
    if (loading) loading.style.display = 'none';
  };
  
  // Exponer funciones globalmente
  window.insertExample = insertExample;
  window.clearEditor = clearEditor;
  window.downloadPDF = downloadPDF;
  