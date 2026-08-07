// Every chart's SVG sets its colors as literal `var(--color-*)` attribute
// strings (see spending-over-time-card.tsx, category-breakdown-donut.tsx,
// member-contribution-chart.tsx) — those custom properties are only defined
// on this page's own <html>. Rendering a cloned/serialized copy of the SVG
// through an <img> (a fully detached document, outside this page's cascade)
// would otherwise resolve every var() reference to nothing. Redeclaring the
// handful of tokens charts actually use in an inline <style> block — rather
// than walking every element and copying computed paint values one by one —
// lets the clone's own var() references resolve exactly like the original,
// and covers any future chart using the same token vocabulary for free.
const CHART_CSS_VARS = [
  "--color-accent",
  "--color-border",
  "--color-border-subtle",
  "--color-text-tertiary",
  "--color-surface",
  "--color-bg-tertiary",
] as const;

// The donut's center total (category-breakdown-donut.tsx) is a plain HTML
// overlay positioned on top of its SVG, not SVG text — invisible to a
// straight SVG-only export. Generic rather than donut-specific: finds every
// leaf (childless) element inside `container` that sits outside the `svg`
// and still has text, and draws each at its own bounding box's center using
// its own computed font/color. For the other two charts, which have no such
// overlay, this simply finds nothing and is a no-op.
function drawOverlayText(
  ctx: CanvasRenderingContext2D,
  container: HTMLElement,
  svg: SVGElement,
) {
  const containerRect = container.getBoundingClientRect();
  const overlayEls = Array.from(container.querySelectorAll("*")).filter(
    (el) =>
      el.children.length === 0 && !svg.contains(el) && el.textContent?.trim(),
  );
  for (const el of overlayEls) {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      el.textContent!.trim(),
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2,
    );
  }
}

// Finds the <svg> inside `container`, resolves it to a static, fully
// self-contained PNG (colors and font baked in, not left as var()
// references), and triggers a browser download. `filenameBase` should
// already be a plain kebab-case name — ".png" is appended here.
export async function exportChartAsImage(
  container: HTMLElement | null,
  filenameBase: string,
): Promise<void> {
  if (!container) {
    throw new Error("No chart to export");
  }
  const svg = container.querySelector("svg");
  if (!svg) {
    throw new Error("No chart to export");
  }

  const width = svg.clientWidth || Number(svg.getAttribute("width")) || 0;
  const height = svg.clientHeight || Number(svg.getAttribute("height")) || 0;
  if (width === 0 || height === 0) {
    throw new Error("Chart has no size to export");
  }

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));

  const rootStyle = getComputedStyle(document.documentElement);
  const varDeclarations = CHART_CSS_VARS.map(
    (name) => `${name}: ${rootStyle.getPropertyValue(name).trim()};`,
  ).join(" ");
  const fontFamily = getComputedStyle(svg).fontFamily;

  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `svg { ${varDeclarations} font-family: ${fontFamily}; }`;
  clone.insertBefore(style, clone.firstChild);

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to render chart image"));
      image.src = svgUrl;
    });

    // 2x scale for a crisp export regardless of the viewing device's pixel
    // ratio.
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas rendering is not supported");
    }
    ctx.scale(scale, scale);
    // Fills with the card's own surface color first, so the exported PNG
    // looks like the chart actually does on its card rather than a
    // transparent chart floating on whatever background it's viewed on
    // elsewhere.
    ctx.fillStyle =
      rootStyle.getPropertyValue("--color-surface").trim() || "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    drawOverlayText(ctx, container, svg);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      throw new Error("Failed to generate chart image");
    }

    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${filenameBase}.png`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
