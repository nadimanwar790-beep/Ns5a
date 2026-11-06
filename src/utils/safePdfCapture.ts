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
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${widthPx}px`;
  iframe.style.height = "1123px";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
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
        background-color: ${bgColor};
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      ${sanitizedCss}
    </style>
  </head>
  <body style="background-color: ${bgColor};">
    ${htmlContent}
  </body>
</html>`);
    iframeDoc.close();

    // Ensure all images in iframe have CORS anonymous flag
    const images = iframeDoc.querySelectorAll("img");
    images.forEach((img) => {
      img.setAttribute("crossorigin", "anonymous");
    });

    // Small delay to allow fonts and images to settle in iframe
    await new Promise<void>((resolve) => setTimeout(resolve, 80));

    const targetNode = options.selector
      ? ((iframeDoc.querySelector(options.selector) as HTMLElement) || (iframeDoc.body.firstElementChild as HTMLElement) || iframeDoc.body)
      : ((iframeDoc.body.firstElementChild as HTMLElement) || iframeDoc.body);

    const canvas = await html2canvas(targetNode, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: bgColor,
      logging: false,
      windowWidth: widthPx,
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
