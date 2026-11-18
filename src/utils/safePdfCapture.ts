// @ts-nocheck
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export interface SafeCanvasOptions {
  widthPx?: number;
  scale?: number;
  backgroundColor?: string;
  selector?: string;
}

/**
 * Sanitizes any oklch(...) colors in a CSS string or element styles to standard hex colors,
 * preventing html2canvas from crashing with:
 * "Attempting to parse an unsupported color function 'oklch'"
 */
function sanitizeOklchInString(str: string): string {
  if (!str) return "";
  return str.replace(/oklch\([^)]+\)/gi, "#1e3a8a");
}

/**
 * Renders arbitrary HTML + CSS in a completely isolated, clean iframe.
 * Eliminates "Attempting to parse an unsupported color function 'oklch'"
 * caused by Tailwind CSS v4 stylesheets on the parent document.
 */
export async function renderHtmlToCanvasSafe(
  htmlContent: string,
  cssText: string = "",
  options: SafeCanvasOptions = {}
): Promise<HTMLCanvasElement> {
  const widthPx = options.widthPx || 794;
  const scale = options.scale || 2;
  const bgColor = options.backgroundColor || "#ffffff";

  // Create isolated iframe detached from parent's Tailwind CSS stylesheets
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-100000px";
  iframe.style.top = "0";
  iframe.style.width = `${widthPx}px`;
  iframe.style.height = "1123px";
  iframe.style.border = "none";
  iframe.style.opacity = "1";
  iframe.style.visibility = "visible";
  iframe.style.pointerEvents = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Unable to access isolated iframe document");
    }

    const sanitizedCss = sanitizeOklchInString(cssText);

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        width: ${widthPx}px;
        background-color: ${bgColor};
        color: #0f172a;
        font-family: "Noto Sans Devanagari", Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      ${sanitizedCss}
    </style>
  </head>
  <body style="background-color: ${bgColor}; margin: 0; padding: 0; width: ${widthPx}px;">
    ${htmlContent}
  </body>
</html>`);
    iframeDoc.close();

    // Ensure all images in iframe have CORS anonymous flag and wait for load (with timeout)
    const images = Array.from(iframeDoc.querySelectorAll("img"));
    const imgPromises = images.map((img) => {
      img.setAttribute("crossorigin", "anonymous");
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 1500);
      });
    });

    await Promise.all([
      Promise.all(imgPromises),
      (iframeDoc as any).fonts?.ready?.catch?.(() => {}) || Promise.resolve(),
      new Promise<void>((resolve) => setTimeout(resolve, 140)),
    ]);

    const targetNode = options.selector
      ? ((iframeDoc.querySelector(options.selector) as HTMLElement) || iframeDoc.body)
      : (iframeDoc.body.children.length === 1
          ? (iframeDoc.body.firstElementChild as HTMLElement)
          : iframeDoc.body);

    const measuredHeight = Math.max(
      targetNode?.scrollHeight || 0,
      iframeDoc.body?.scrollHeight || 0,
      1123
    );
    iframe.style.height = `${measuredHeight + 24}px`;

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const canvas = await html2canvas(targetNode, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      windowWidth: widthPx,
      windowHeight: measuredHeight + 24,
      onclone: (clonedDoc) => {
        // Strict safety: sanitize any foreign stylesheets in cloned document
        const styles = Array.from(clonedDoc.querySelectorAll("style, link[rel='stylesheet']"));
        for (const s of styles) {
          if (s.textContent && s.textContent.includes("oklch")) {
            s.textContent = sanitizeOklchInString(s.textContent);
          }
        }
      },
    });

    return canvas;
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

/**
 * Captures an existing DOM element safely by extracting its HTML and styles
 * and rendering it inside an isolated iframe without oklch errors.
 */
export async function captureDomElementSafe(
  element: HTMLElement,
  options: SafeCanvasOptions = {}
): Promise<HTMLCanvasElement> {
  const widthPx = options.widthPx || element.offsetWidth || 794;
  const htmlContent = element.outerHTML;

  // Collect style tags from document to keep formatting, but sanitize oklch
  let collectedCss = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (!rule.cssText.includes("oklch")) {
            collectedCss += rule.cssText + "\n";
          }
        }
      } catch {
        // Cross-origin stylesheet, skip
      }
    }
  } catch {}

  return renderHtmlToCanvasSafe(htmlContent, collectedCss, {
    ...options,
    widthPx,
  });
}
