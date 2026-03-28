"use client";

import type { InspectParams } from "react-dev-inspector";
import { Inspector } from "react-dev-inspector";

function openInEditor({ codeInfo }: Required<InspectParams>) {
    const { absolutePath, relativePath, lineNumber, columnNumber } = codeInfo;
    const fileName = absolutePath || relativePath;
    if (!fileName) return;
    const params = new URLSearchParams({
        fileName,
        lineNumber: String(lineNumber ?? 1),
        colNumber: String(columnNumber ?? 1),
    });
    fetch(`/api/open-in-editor?${params}`);
}

export function DevInspector() {
    return (
        <Inspector
            keys={["ctrl", "shift", "x"]}
            onInspectElement={openInEditor}
        />
    );
}
