function iconRoot(document:Document):SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

export function commitIcon(document:Document):SVGSVGElement {
  const svg = iconRoot(document);
  const lines = document.createElementNS(svg.namespaceURI, "path");
  lines.setAttribute("d", "M3 12h5m8 0h5");
  const circle = document.createElementNS(svg.namespaceURI, "circle");
  circle.setAttribute("cx", "12"); circle.setAttribute("cy", "12"); circle.setAttribute("r", "4");
  svg.append(lines, circle);
  return svg;
}

export function fileStatusIcon(document:Document, status:string):SVGSVGElement {
  const svg = iconRoot(document);
  const labels:Record<string,string> = { M:"수정 파일", A:"추가 파일", D:"삭제 파일", R:"이름 변경 파일", C:"복사 파일", U:"충돌 파일", "??":"미추적 파일", "?":"미추적 파일" };
  svg.removeAttribute("aria-hidden"); svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", labels[status] ?? "변경 파일");
  svg.setAttribute("data-bb-chat-ui-info-file-status", status);
  const box = document.createElementNS(svg.namespaceURI, "rect");
  for (const [key,value] of Object.entries({ x:"4", y:"4", width:"16", height:"16", rx:"4" })) box.setAttribute(key,value);
  svg.append(box);
  const paths:Record<string,string> = {
    A:"M8 12h8m-4-4v8", D:"M8 12h8", R:"M8 12h8m-4-4 4 4-4 4", C:"M9 9h6v6H9zM7 7h6", U:"M12 8v5",
    "??":"M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4", "?":"M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4",
  };
  if (paths[status]) {
    const path = document.createElementNS(svg.namespaceURI, "path"); path.setAttribute("d", paths[status]); svg.append(path);
  }
  if (status === "M" || status === "U" || status === "?" || status === "??") {
    const dot = document.createElementNS(svg.namespaceURI, "circle");
    dot.setAttribute("cx", "12"); dot.setAttribute("cy", status === "M" ? "12" : "16"); dot.setAttribute("r", "1");
    dot.setAttribute("fill", "currentColor"); dot.setAttribute("stroke", "none"); svg.append(dot);
  }
  if (status === "A") svg.classList.add("text-diff-added");
  else if (status === "D") svg.classList.add("text-diff-removed");
  else svg.classList.add("text-subtle-foreground");
  return svg;
}
