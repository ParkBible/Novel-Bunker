"use client";

import {
    forceCenter,
    forceLink,
    forceManyBody,
    forceSimulation,
    type SimulationLinkDatum,
    type SimulationNodeDatum,
} from "d3-force";
import { GitFork, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useEditorStore } from "@/app/(shared)/stores/editorStore";
import { DashboardCard } from "./DashboardCard";

interface GraphNode extends SimulationNodeDatum {
    id: number;
    name: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
    relationId: number;
    label: string;
}

export function RelationshipDiagram() {
    const { characters, relationships, addRelationship, removeRelationship } =
        useEditorStore();

    const [fromId, setFromId] = useState<string>("");
    const [toId, setToId] = useState<string>("");
    const [label, setLabel] = useState("");

    const { nodes, links } = useMemo(() => {
        const relatedCharIds = new Set<number>();
        for (const r of relationships) {
            relatedCharIds.add(r.fromCharacterId);
            relatedCharIds.add(r.toCharacterId);
        }

        const graphNodes: GraphNode[] = characters
            .filter(
                (c): c is typeof c & { id: number } =>
                    c.id != null && relatedCharIds.has(c.id),
            )
            .map((c) => ({ id: c.id, name: c.name }));

        const graphLinks: GraphLink[] = relationships
            .filter(
                (r): r is typeof r & { id: number } =>
                    r.id != null &&
                    relatedCharIds.has(r.fromCharacterId) &&
                    relatedCharIds.has(r.toCharacterId),
            )
            .map((r) => ({
                source: r.fromCharacterId,
                target: r.toCharacterId,
                relationId: r.id,
                label: r.label,
            }));

        if (graphNodes.length === 0) {
            return { nodes: [], links: [] };
        }

        const simulation = forceSimulation<GraphNode>(graphNodes)
            .force(
                "link",
                forceLink<GraphNode, GraphLink>(graphLinks)
                    .id((d) => d.id)
                    .distance(120),
            )
            .force("charge", forceManyBody().strength(-300))
            .force("center", forceCenter(200, 150))
            .stop();

        simulation.tick(300);

        return { nodes: graphNodes, links: graphLinks };
    }, [characters, relationships]);

    const handleAdd = async () => {
        if (!fromId || !toId || !label.trim() || fromId === toId) return;
        await addRelationship(Number(fromId), Number(toId), label.trim());
        setFromId("");
        setToId("");
        setLabel("");
    };

    return (
        <DashboardCard title="등장인물 관계도" icon={GitFork}>
            {nodes.length > 0 ? (
                <svg
                    viewBox="0 0 400 300"
                    role="img"
                    aria-label="등장인물 관계도"
                    className="w-full rounded-md border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
                >
                    {links.map((link) => {
                        const source = link.source as GraphNode;
                        const target = link.target as GraphNode;
                        const midX = ((source.x ?? 0) + (target.x ?? 0)) / 2;
                        const midY = ((source.y ?? 0) + (target.y ?? 0)) / 2;
                        return (
                            <g key={link.relationId}>
                                <line
                                    x1={source.x}
                                    y1={source.y}
                                    x2={target.x}
                                    y2={target.y}
                                    className="stroke-zinc-300 dark:stroke-zinc-600"
                                    strokeWidth={1.5}
                                />
                                <text
                                    x={midX}
                                    y={midY - 6}
                                    textAnchor="middle"
                                    className="fill-zinc-500 text-[10px] dark:fill-zinc-400"
                                >
                                    {link.label}
                                </text>
                                {/* biome-ignore lint/a11y/useSemanticElements: SVG 내부에서는 button 사용 불가 */}
                                <g
                                    role="button"
                                    tabIndex={0}
                                    className="cursor-pointer"
                                    onClick={() =>
                                        removeRelationship(link.relationId)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ")
                                            removeRelationship(link.relationId);
                                    }}
                                >
                                    <circle
                                        cx={midX + 20}
                                        cy={midY - 8}
                                        r={6}
                                        className="fill-zinc-200 hover:fill-red-100 dark:fill-zinc-700 dark:hover:fill-red-900"
                                    />
                                    <text
                                        x={midX + 20}
                                        y={midY - 5}
                                        textAnchor="middle"
                                        className="fill-zinc-500 text-[8px] hover:fill-red-500 dark:fill-zinc-400"
                                    >
                                        ✕
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                    {nodes.map((node) => (
                        <g key={node.id}>
                            <circle
                                cx={node.x}
                                cy={node.y}
                                r={20}
                                className="fill-zinc-900 dark:fill-zinc-100"
                            />
                            <text
                                x={node.x}
                                y={(node.y ?? 0) + 4}
                                textAnchor="middle"
                                className="fill-white text-[11px] font-medium dark:fill-zinc-900"
                            >
                                {node.name}
                            </text>
                        </g>
                    ))}
                </svg>
            ) : (
                <p className="py-4 text-center text-sm text-zinc-500">
                    아직 등장인물 관계가 없습니다.
                </p>
            )}

            <div className="mt-4 flex flex-wrap items-end gap-2">
                <select
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                    <option value="">인물 선택</option>
                    {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <span className="text-sm text-zinc-400">→</span>
                <select
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                    <option value="">인물 선택</option>
                    {characters.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="관계 라벨"
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                    }}
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={
                        !fromId || !toId || !label.trim() || fromId === toId
                    }
                    className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    <Plus className="h-3 w-3" />
                    추가
                </button>
            </div>
        </DashboardCard>
    );
}
