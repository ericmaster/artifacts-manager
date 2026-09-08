#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function printHelp() {
  console.log(`
Usage: generate-c4-artifact [options]

Generates a single-file C4 architecture dashboard HTML artifact from workspace.dsl
and registers it with Artifacts Manager.

Options:
  --project <path>       Project directory containing workspace.dsl (default: cwd)
  --output <filename>    Output filename in .artifacts-manager/ (default: architecture-model.html)
  --id <artifact-id>     Artifact ID in manifest.json (default: architecture-model)
  --title <string>       Custom artifact title (default: [Workspace Name] C4 Architecture Model)
  --views <keys>         Comma-separated view keys to include (default: all views)
  --validate-only        Validate workspace and views without writing artifact or updating manifest
  -h, --help             Show this help message
`);
}

function parseArgs(argv) {
  const args = {
    project: process.cwd(),
    output: 'architecture-model.html',
    id: 'architecture-model',
    title: '',
    views: null,
    validateOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--project') {
      args.project = path.resolve(argv[++i]);
    } else if (arg === '--output') {
      args.output = argv[++i];
    } else if (arg === '--id') {
      args.id = argv[++i];
    } else if (arg === '--title') {
      args.title = argv[++i];
    } else if (arg === '--views') {
      args.views = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--validate-only') {
      args.validateOnly = true;
    }
  }

  return args;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveCodeUrl(codePath) {
  if (!codePath) return '';
  if (codePath.startsWith('http://') || codePath.startsWith('https://')) {
    if (codePath.includes('github.com/Nimblersoft/nimblerbot/') && codePath.includes('/typebot/')) {
      return codePath.replace(
        'github.com/Nimblersoft/nimblerbot/tree/main/typebot/',
        'github.com/Nimblersoft/typebot/tree/nimblerbot/'
      ).replace(
        'github.com/Nimblersoft/nimblerbot/blob/main/typebot/',
        'github.com/Nimblersoft/typebot/blob/nimblerbot/'
      );
    }
    return codePath;
  }

  const isFile = /\.[a-zA-Z0-9]+$/.test(codePath);
  const typeAction = isFile ? 'blob' : 'tree';

  if (codePath.startsWith('typebot/')) {
    const subPath = codePath.slice('typebot/'.length);
    return `https://github.com/Nimblersoft/typebot/${typeAction}/nimblerbot/${subPath}`;
  }

  return `https://github.com/Nimblersoft/nimblerbot/${typeAction}/main/${codePath}`;
}

async function copyDirRecursive(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function chmodRecursive(dir, mode) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await chmodRecursive(fullPath, mode);
    }
    await fs.chmod(fullPath, mode).catch(() => {});
  }
  await fs.chmod(dir, mode).catch(() => {});
}

async function runDocker(args) {
  try {
    return await execFileAsync('docker', args);
  } catch (err) {
    const cmd = `docker ${args.join(' ')}`;
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`Command failed: ${cmd}\n${stderr}`);
  }
}

// Generate a safe Mermaid subgraph/node ID (alphanumeric + underscores only)
function safeId(name) {
  return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Build a node card HTML for Mermaid (single-quoted attributes for Mermaid compatibility)
function buildNodeCard(el, isCollapsible) {
  const titleColor = el.type === 'Person'
    ? '#34d399'
    : el.type === 'Container'
    ? '#38bdf8'
    : el.type === 'Component'
    ? '#818cf8'
    : el.type === 'Code Module' || el.type === 'Tool Action'
    ? '#34d399'
    : '#a5b4fc';

  const expandBadge = isCollapsible
    ? "<div style='margin-top:6px;'><span style='display:inline-flex;align-items:center;gap:4px;font-size:9.5px;color:#c084fc;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:rgba(192,132,252,0.15);padding:3px 8px;border-radius:4px;border:1px solid rgba(192,132,252,0.4);cursor:pointer;'>▶ Click to Expand</span></div>"
    : '';

  const codeLink = el.url
    ? `<div style='margin-top:6px;'><a href='${el.url}' target='_blank' rel='noopener noreferrer' style='display:inline-flex;align-items:center;gap:3px;font-size:9.5px;color:#38bdf8;text-decoration:none;background:rgba(56,189,248,0.1);padding:2px 6px;border-radius:4px;border:1px solid rgba(56,189,248,0.3);'>↗ View Code</a></div>`
    : '';

  const techLabel = el.technology ? `: ${escapeHtml(el.technology)}` : '';
  const desc = el.description ? escapeHtml(el.description).substring(0, 120) : '';

  return `<div class='c4-node-card' style='width:230px;max-width:230px;overflow-wrap:anywhere;text-align:center;padding:8px 12px;font-family:system-ui,-apple-system,sans-serif;'><div style='font-weight:700;font-size:13.5px;color:${titleColor};margin-bottom:3px;'>${escapeHtml(el.name)}</div><div style='font-size:9.5px;color:#94a3b8;font-family:ui-monospace,monospace;margin-bottom:4px;'>[${escapeHtml(el.type)}${techLabel}]</div><div style='font-size:11px;line-height:1.4;color:#cbd5e1;'>${desc}</div>${expandBadge}${codeLink}</div>`;
}

// Build the unified Mermaid diagram body, edges, and styles
function buildUnifiedDiagram(ws, elements, collapsibleGroups) {
  const bodyLines = [];
  const styleLines = [];
  const edgeLines = [];
  const overviewEdgeLines = [];

  // Color map for different element types
  const containerFill = '#131c31';
  const containerStroke = '#2563eb';
  const componentFill = '#1e293b';
  const componentStroke = '#818cf8';
  const externalFill = '#1e293b';
  const externalStroke = '#475569';
  const personFill = '#291e0a';
  const personStroke = '#d29922';
  const codeModuleFill = '#0f766e';
  const codeModuleStroke = '#14b8a6';
  const routerFill = '#1e1b4b';
  const routerStroke = '#818cf8';
  const guardFill = '#291e0a';
  const guardStroke = '#d29922';
  const model = ws.model || {};
  const people = model.people || [];
  const softwareSystems = model.softwareSystems || [];
  const externalSystems = softwareSystems.filter((sys) => elements[sys.id]?.external);
  const internalSystems = softwareSystems.filter((sys) => !elements[sys.id]?.external);
  const nodeIdByElementId = new Map();
  const elementGroupIds = new Map();

  function getStyleForEl(el, nodeId) {
    if (el.type === 'Person') return `  style ${nodeId} fill:${personFill},stroke:${personStroke},color:#fef3c7`;
    if (el.external) return `  style ${nodeId} fill:${externalFill},stroke:${externalStroke},color:#94a3b8`;
    if (el.type === 'Container') return `  style ${nodeId} fill:${containerFill},stroke:${containerStroke},color:#f8fafc`;
    if (el.type === 'Component') return `  style ${nodeId} fill:${componentFill},stroke:${componentStroke},color:#f8fafc`;
    if (el.type === 'Code Module' || el.type === 'Tool Action') return `  style ${nodeId} fill:${codeModuleFill},stroke:${codeModuleStroke},color:#f0fdfa`;
    return `  style ${nodeId} fill:${containerFill},stroke:${containerStroke},color:#f8fafc`;
  }

  if (internalSystems.length === 0) {
    throw new Error('No internal software system found in workspace model');
  }

  function addOrderLinks(indent, nodeIds) {
    if (nodeIds.length < 2) return;
    bodyLines.push(`${indent}${nodeIds.join(' ~~~ ')}`);
  }

  function addClusterStyle(nodeId, fill, stroke, color) {
    styleLines.push(`  style ${nodeId} fill:${fill},stroke:${stroke},color:${color}`);
  }

  function addElementGroup(elementId, groupId) {
    if (!elementGroupIds.has(elementId)) elementGroupIds.set(elementId, new Set());
    elementGroupIds.get(elementId).add(groupId);
  }

  function emitLeaf(meta, nodeId, indent) {
    bodyLines.push(`${indent}${nodeId}["${buildNodeCard(meta, false)}"]`);
    styleLines.push(getStyleForEl(meta, nodeId));
  }

  const codeModules = [
    'code_inbox', 'code_runtime', 'code_handlers', 'code_router', 'code_model',
    'code_tools', 'code_services', 'code_days', 'code_slots', 'code_confirm',
    'code_handoff', 'code_api', 'code_guard', 'code_vlogs'
  ];

  function emitContainer(container, indent) {
    const containerMeta = elements[container.id];
    if (!containerMeta) return null;

    const nodeId = safeId(container.name);
    nodeIdByElementId.set(container.id, nodeId);
    const components = container.components || [];

    if (components.length === 0) {
      emitLeaf(containerMeta, nodeId, indent);
      return nodeId;
    }

    bodyLines.push(`${indent}subgraph ${nodeId} ["${escapeHtml(container.name)}"]`);
    addElementGroup(container.id, nodeId);
    addClusterStyle(nodeId, container.name === 'Booking Worker' ? '#0b0f19' : '#0b1120', containerStroke, '#38bdf8');
    collapsibleGroups[nodeId] = {
      label: container.name,
      parentId: null,
      level: 'Level 3: Components',
      children: [],
    };

    for (const comp of components) {
      const compMeta = elements[comp.id];
      if (!compMeta) continue;
      const compNodeId = safeId(comp.name);
      nodeIdByElementId.set(comp.id, compNodeId);
      addElementGroup(comp.id, nodeId);

      if (comp.name === 'Receptionist Forge' && codeModules.some((codeId) => elements[codeId])) {
        bodyLines.push(`${indent}  subgraph ${compNodeId} ["${escapeHtml(comp.name)}"]`);
        addClusterStyle(compNodeId, '#0a0e1a', componentStroke, '#818cf8');
        collapsibleGroups[compNodeId] = {
          label: comp.name,
          parentId: nodeId,
          level: 'Level 4: Code Flow',
          children: [],
        };
        collapsibleGroups[nodeId].children.push(compNodeId);
        addElementGroup(comp.id, compNodeId);

        for (const codeId of codeModules) {
          const codeMeta = elements[codeId];
          if (!codeMeta) continue;
          nodeIdByElementId.set(codeId, codeId);
          addElementGroup(codeId, compNodeId);
          bodyLines.push(`${indent}    ${codeId}["${buildNodeCard(codeMeta, false)}"]`);
          if (codeId === 'code_router' || codeId === 'code_model') {
            styleLines.push(`  style ${codeId} fill:${routerFill},stroke:${routerStroke},color:#e0e7ff`);
          } else if (codeId === 'code_guard') {
            styleLines.push(`  style ${codeId} fill:${guardFill},stroke:${guardStroke},color:#fef3c7`);
          } else if (codeMeta.type === 'Tool Action') {
            styleLines.push(`  style ${codeId} fill:${codeModuleFill},stroke:${codeModuleStroke},color:#f0fdfa`);
          } else {
            styleLines.push(`  style ${codeId} fill:${containerFill},stroke:${containerStroke},color:#f8fafc`);
          }
        }

        bodyLines.push(`${indent}  end`);
      } else {
        emitLeaf(compMeta, compNodeId, `${indent}  `);
      }
    }

    bodyLines.push(`${indent}end`);
    return nodeId;
  }

  function isDatastore(container) {
    const meta = elements[container.id];
    return meta?.tags?.some((tag) => /datastore|database|queue|cache/i.test(tag)) || false;
  }

  function emitSystemContent(system, indent) {
    const systemId = safeId(system.name);
    const containers = system.containers || [];
    const applicationContainers = containers.filter((container) => !isDatastore(container));
    const dataContainers = containers.filter((container) => isDatastore(container));
    const applicationId = `${systemId}_Application`;
    const dataId = `${systemId}_Data`;
    const applicationCardsId = `${applicationId}_Cards`;
    const dataCardsId = `${dataId}_Cards`;
    const applicationAnchor = `c4_layout_${systemId}_application_anchor`;
    const dataAnchor = `c4_layout_${systemId}_data_anchor`;

    bodyLines.push(`${indent}subgraph ${applicationId} ["Application"]`);
    bodyLines.push(`${indent}  direction TB`);
    bodyLines.push(`${indent}  ${applicationAnchor}(( ))`);
    bodyLines.push(`${indent}  subgraph ${applicationCardsId} [" "]`);
    bodyLines.push(`${indent}    direction LR`);
    const applicationNodeIds = applicationContainers
      .map((container) => emitContainer(container, `${indent}    `))
      .filter(Boolean);
    addOrderLinks(`${indent}    `, applicationNodeIds);
    bodyLines.push(`${indent}  end`);
    bodyLines.push(`${indent}end`);
    addClusterStyle(applicationCardsId, 'transparent', 'transparent', 'transparent');

    bodyLines.push(`${indent}subgraph ${dataId} ["Data"]`);
    bodyLines.push(`${indent}  direction TB`);
    bodyLines.push(`${indent}  ${dataAnchor}(( ))`);
    bodyLines.push(`${indent}  subgraph ${dataCardsId} [" "]`);
    bodyLines.push(`${indent}    direction LR`);
    const dataNodeIds = dataContainers
      .map((container) => emitContainer(container, `${indent}    `))
      .filter(Boolean);
    addOrderLinks(`${indent}    `, dataNodeIds);
    bodyLines.push(`${indent}  end`);
    bodyLines.push(`${indent}end`);
    addClusterStyle(dataCardsId, 'transparent', 'transparent', 'transparent');

    return { applicationAnchor, dataAnchor };
  }

  const usersBandId = 'c4_layout_users_band';
  const usersCardsId = 'c4_layout_users_cards';
  const usersAnchor = 'c4_layout_users_anchor';
  const internalAnchor = 'c4_layout_internal_anchor';
  const externalBandId = 'c4_layout_external_band';
  const externalCardsId = 'c4_layout_external_cards';
  const externalAnchor = 'c4_layout_external_anchor';

  bodyLines.push(`  subgraph ${usersBandId} ["Users"]`);
  bodyLines.push(`    direction TB`);
  bodyLines.push(`    ${usersAnchor}(( ))`);
  bodyLines.push(`    subgraph ${usersCardsId} [" "]`);
  bodyLines.push(`      direction LR`);
  const userNodeIds = [];

  for (const person of people) {
    const nodeId = safeId(person.name);
    const meta = elements[person.id];
    if (!meta) continue;
    nodeIdByElementId.set(person.id, nodeId);
    userNodeIds.push(nodeId);
    emitLeaf(meta, nodeId, '      ');
  }
  addOrderLinks('      ', userNodeIds);
  bodyLines.push(`    end`);
  bodyLines.push(`  end`);
  addClusterStyle(usersCardsId, 'transparent', 'transparent', 'transparent');

  const internalRootId = internalSystems.length === 1 ? safeId(internalSystems[0].name) : 'c4_layout_internal_systems';
  const internalRootLabel = internalSystems.length === 1 ? internalSystems[0].name : 'Internal Systems';
  bodyLines.push(`  subgraph ${internalRootId} ["${escapeHtml(internalRootLabel)}"]`);
  bodyLines.push(`    direction TB`);
  bodyLines.push(`    ${internalAnchor}(( ))`);
  addClusterStyle(internalRootId, '#0b0f19', '#1e3a5f', '#94a3b8');

  const systemAnchors = [];
  for (const [index, system] of internalSystems.entries()) {
    const systemId = safeId(system.name);
    const isRootSystem = internalSystems.length === 1;
    if (!isRootSystem) {
      bodyLines.push(`    subgraph ${systemId} ["${escapeHtml(system.name)}"]`);
      bodyLines.push(`      direction TB`);
      addClusterStyle(systemId, '#0b0f19', '#1e3a5f', '#94a3b8');
    }
    const contentIndent = isRootSystem ? '    ' : '      ';
    const anchors = emitSystemContent(system, contentIndent);
    systemAnchors.push(anchors);
    if (!isRootSystem) bodyLines.push(`    end`);
    if (index === 0) nodeIdByElementId.set(system.id, internalRootId);
  }
  bodyLines.push(`  end`);

  bodyLines.push(`  subgraph ${externalBandId} ["External Connections"]`);
  bodyLines.push(`    direction TB`);
  bodyLines.push(`    ${externalAnchor}(( ))`);
  bodyLines.push(`    subgraph ${externalCardsId} [" "]`);
  bodyLines.push(`      direction LR`);
  const externalNodeIds = [];
  for (const sys of externalSystems) {
    const el = elements[sys.id];
    if (!el) continue;
    const nodeId = safeId(sys.name);
    nodeIdByElementId.set(sys.id, nodeId);
    externalNodeIds.push(nodeId);
    emitLeaf(el, nodeId, '      ');
  }
  addOrderLinks('      ', externalNodeIds);
  bodyLines.push(`    end`);
  bodyLines.push(`  end`);
  addClusterStyle(externalCardsId, 'transparent', 'transparent', 'transparent');

  const allRelationships = [];

  function collectRelationships(el) {
    if (!el) return;
    for (const rel of (el.relationships || [])) {
      allRelationships.push({
        sourceId: el.id,
        sourceName: el.name,
        destId: rel.destinationId,
        description: rel.description || '',
        technology: rel.technology || '',
      });
    }
  }

  for (const person of people) collectRelationships(person);
  for (const system of softwareSystems) {
    collectRelationships(system);
    for (const container of (system.containers || [])) {
      collectRelationships(container);
      for (const comp of (container.components || [])) {
        collectRelationships(comp);
      }
    }
  }

  function getNodeId(elementId) {
    if (nodeIdByElementId.has(elementId)) return nodeIdByElementId.get(elementId);
    const el = elements[elementId];
    if (!el) return null;
    return elementId.startsWith('code_') ? elementId : safeId(el.name);
  }

  function getElementGroups(elementId) {
    const groups = new Set();
    for (const directGroupId of elementGroupIds.get(elementId) || []) {
      let groupId = directGroupId;
      while (groupId) {
        groups.add(groupId);
        groupId = collapsibleGroups[groupId]?.parentId || null;
      }
    }
    return groups;
  }

  function groupDepth(groupId) {
    let depth = 0;
    let current = groupId;
    while (collapsibleGroups[current]?.parentId) {
      depth += 1;
      current = collapsibleGroups[current].parentId;
    }
    return depth;
  }

  function topLevelGroup(groupId) {
    let current = groupId;
    while (collapsibleGroups[current]?.parentId) current = collapsibleGroups[current].parentId;
    return current;
  }

  const edgeGroupLines = { root: [] };

  function addEdge(fromId, toId, label, sourceElementId, destinationElementId) {
    const line = label
      ? `  ${fromId} -->|"${escapeHtml(label)}"| ${toId}`
      : `  ${fromId} --> ${toId}`;
    edgeLines.push(line);

    const fromGroups = getElementGroups(sourceElementId);
    const toGroups = getElementGroups(destinationElementId);
    const sharedGroups = [...fromGroups].filter((groupId) => toGroups.has(groupId));
    if (sharedGroups.length > 0) {
      const deepestGroup = sharedGroups.sort((a, b) => groupDepth(b) - groupDepth(a))[0];
      if (!edgeGroupLines[deepestGroup]) edgeGroupLines[deepestGroup] = [];
      edgeGroupLines[deepestGroup].push(line);
      return;
    }

    const scopedGroups = new Set([...fromGroups, ...toGroups].map(topLevelGroup));
    if (scopedGroups.size === 0) {
      edgeGroupLines.root.push(line);
      return;
    }
    for (const groupId of scopedGroups) {
      if (!edgeGroupLines[groupId]) edgeGroupLines[groupId] = [];
      edgeGroupLines[groupId].push(line);
    }
  }

  for (const rel of allRelationships) {
    const fromId = getNodeId(rel.sourceId);
    const toId = getNodeId(rel.destId);
    if (!fromId || !toId) continue;
    if (fromId === toId) continue; // skip self-refs

    const label = rel.description
      ? rel.description.substring(0, 50)
      : '';

    addEdge(fromId, toId, label, rel.sourceId, rel.destId);
  }

  const codeFlowEdges = [
    ['code_inbox', 'code_runtime'],
    ['code_runtime', 'code_handlers'],
    ['code_handlers', 'code_router'],
    ['code_router', 'code_model'],
    ['code_model', 'code_tools'],
    ['code_tools', 'code_services'],
    ['code_tools', 'code_days'],
    ['code_tools', 'code_slots'],
    ['code_tools', 'code_confirm'],
    ['code_tools', 'code_handoff'],
    ['code_tools', 'code_api'],
    ['code_tools', 'code_guard'],
    ['code_guard', 'code_vlogs'],
  ];
  for (const [from, to] of codeFlowEdges) {
    if (elements[from] && elements[to]) addEdge(from, to, '', from, to);
  }

  const primaryAnchors = systemAnchors[0] || {};
  const overviewAnchors = [
    usersAnchor,
    internalAnchor,
    primaryAnchors.applicationAnchor,
    primaryAnchors.dataAnchor,
    externalAnchor,
  ].filter(Boolean);
  for (let index = 1; index < overviewAnchors.length; index += 1) {
    overviewEdgeLines.push(`  ${overviewAnchors[index - 1]} ~~~ ${overviewAnchors[index]}`);
  }

  const layoutNodeIds = [...new Set([usersAnchor, internalAnchor, externalAnchor, ...overviewAnchors.slice(2)])];
  for (const nodeId of layoutNodeIds) {
    styleLines.push(`  style ${nodeId} fill:transparent,stroke:transparent,color:transparent,opacity:0`);
  }

  return {
    body: bodyLines.join('\n'),
    styles: styleLines.join('\n'),
    edges: [...new Set(edgeLines)].join('\n'), // deduplicate
    edgeGroups: Object.fromEntries(Object.entries(edgeGroupLines).map(([groupId, lines]) => [groupId, [...new Set(lines)]])),
    overviewEdges: overviewEdgeLines.join('\n'),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = path.resolve(args.project);
  const dslPath = path.join(projectDir, 'workspace.dsl');

  try {
    await fs.access(dslPath);
  } catch {
    console.error(`\x1b[31mError: workspace.dsl not found at ${dslPath}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[1m[1/5] Setting up clean staging environment...\x1b[0m`);
  const stage = await fs.mkdtemp(path.join(os.tmpdir(), 'structurizr-stage-'));
  const outDir = path.join(stage, 'out');
  await fs.mkdir(outDir, { recursive: true });

  const uid = process.getuid ? process.getuid() : 1000;
  const gid = process.getgid ? process.getgid() : 1000;

  try {
    await fs.copyFile(dslPath, path.join(stage, 'workspace.dsl'));

    const docsDir = path.join(projectDir, 'docs');
    try {
      const docsStat = await fs.stat(docsDir);
      if (docsStat.isDirectory()) {
        await copyDirRecursive(docsDir, path.join(stage, 'docs'));
      }
    } catch {
      // docs folder optional
    }

    await chmodRecursive(stage, 0o755);

    console.log(`\x1b[1m[2/5] Validating workspace.dsl with Structurizr...\x1b[0m`);
    await runDocker([
      'run', '--rm',
      '--user', `${uid}:${gid}`,
      '-v', `${stage}:/work:ro`,
      '-w', '/work',
      'structurizr/structurizr:latest',
      'validate', '-workspace', '/work/workspace.dsl'
    ]);
    console.log(`\x1b[32m✓ Validation passed\x1b[0m`);

    console.log(`\x1b[1m[3/5] Exporting workspace AST (JSON)...\x1b[0m`);
    await runDocker([
      'run', '--rm',
      '--user', `${uid}:${gid}`,
      '-v', `${stage}:/work:ro`,
      '-v', `${outDir}:/out`,
      '-w', '/work',
      'structurizr/structurizr:latest',
      'export', '-workspace', '/work/workspace.dsl',
      '-format', 'json', '-output', '/out'
    ]);

    const wsRaw = await fs.readFile(path.join(outDir, 'workspace.json'), 'utf8');
    const ws = JSON.parse(wsRaw);
    const workspaceName = ws.name || path.basename(projectDir);
    const workspaceDesc = ws.description || '';

    // Collect all elements
    const elements = {};
    function collect(el, type) {
      if (!el || !el.id) return;
      const tags = (el.tags || '').split(',').map((t) => t.trim()).filter(Boolean);
      const isPlanned = tags.some((t) => /planned/i.test(t)) || /planned/i.test(el.description || '');
      const isExternal = tags.some((t) => /external/i.test(t));

      const rawCodePath = el.properties?.code || '';
      const resolvedUrl = resolveCodeUrl(rawCodePath || el.url || '');

      const item = {
        id: el.id,
        name: el.name || 'Unnamed Element',
        type: type,
        description: el.description || '',
        technology: el.technology || '',
        url: resolvedUrl,
        tags: tags,
        planned: isPlanned,
        external: isExternal,
        properties: el.properties || {},
      };
      elements[el.id] = item;
      if (el.name) {
        elements[safeId(el.name)] = item;
      }
    }

    (ws.model?.people || []).forEach((p) => collect(p, 'Person'));
    (ws.model?.softwareSystems || []).forEach((sys) => {
      collect(sys, 'Software System');
      (sys.containers || []).forEach((c) => {
        collect(c, 'Container');
        (c.components || []).forEach((comp) => collect(comp, 'Component'));
      });
    });

    // Level 4 Code Flow elements
    const codeFlowElements = {
      'code_inbox': { id: 'code_inbox', name: 'inboundInbox.ts', type: 'Code Module', technology: 'TypeScript / PostgreSQL', description: 'Unique inbound receipt, 120s renewable lease, and every-minute recovery query.', url: resolveCodeUrl('typebot/packages/whatsapp/src/inbox'), properties: { code: 'typebot/packages/whatsapp/src/inbox' } },
      'code_runtime': { id: 'code_runtime', name: 'resumeWhatsAppFlow.ts', type: 'Code Module', technology: 'TypeScript', description: 'Claims and resumes ChatSession; builds variable context before invoking Forge blocks.', url: resolveCodeUrl('typebot/packages/whatsapp/src/resumeWhatsAppFlow.ts'), properties: { code: 'typebot/packages/whatsapp/src/resumeWhatsAppFlow.ts' } },
      'code_handlers': { id: 'code_handlers', name: 'handlers.ts (runReception)', type: 'Code Module', technology: 'TypeScript', description: 'Main Receptionist Forge block orchestrator.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/handlers.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/handlers.ts' } },
      'code_router': { id: 'code_router', name: 'createProviderRouterMiddleware.ts', type: 'Code Module', technology: 'TypeScript', description: 'Proactive Google TPM counter with reactive failover to OpenRouter.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/createProviderRouterMiddleware.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/createProviderRouterMiddleware.ts' } },
      'code_model': { id: 'code_model', name: 'resolveLanguageModel.ts', type: 'Code Module', technology: 'AI SDK / TypeScript', description: 'Resolves AI SDK language model for Google AI Studio or OpenRouter.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/resolveLanguageModel.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/resolveLanguageModel.ts' } },
      'code_tools': { id: 'code_tools', name: 'bookingTools.ts', type: 'Code Module', technology: 'AI SDK / TypeScript', description: 'Defines conversational booking tools.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/bookingTools.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/bookingTools.ts' } },
      'code_services': { id: 'code_services', name: 'fetchServices.ts', type: 'Tool Action', technology: 'TypeScript', description: 'Retrieves instance-scoped service catalog.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/fetchServices.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/fetchServices.ts' } },
      'code_days': { id: 'code_days', name: 'fetchAvailableDays.ts', type: 'Tool Action', technology: 'TypeScript', description: 'Queries available dates via Google Calendar.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/fetchAvailableDays.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/fetchAvailableDays.ts' } },
      'code_slots': { id: 'code_slots', name: 'forceSlotsAfterDaySelect.ts', type: 'Tool Action', technology: 'TypeScript', description: 'Allocates bookable time slots.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/forceSlotsAfterDaySelect.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/forceSlotsAfterDaySelect.ts' } },
      'code_confirm': { id: 'code_confirm', name: 'forceConfirmAfterPhoneCapture.ts', type: 'Tool Action', technology: 'TypeScript', description: 'Validates phone and writes appointment to D1.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/forceConfirmAfterPhoneCapture.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/forceConfirmAfterPhoneCapture.ts' } },
      'code_handoff': { id: 'code_handoff', name: 'requestHumanHandoff.ts', type: 'Tool Action', technology: 'TypeScript', description: 'Issues handoff record and Mattermost alert.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/requestHumanHandoff.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/requestHumanHandoff.ts' } },
      'code_api': { id: 'code_api', name: 'bookingApi.ts', type: 'Code Module', technology: 'Hono / TypeScript', description: 'Authenticated HTTP client for Booking Engine API.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/bookingApi.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/bookingApi.ts' } },
      'code_guard': { id: 'code_guard', name: 'outputGuard.ts', type: 'Code Module', technology: 'TypeScript', description: 'Hallucination guard: validates LLM output.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/actions/outputGuard.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/actions/outputGuard.ts' } },
      'code_vlogs': { id: 'code_vlogs', name: 'victorialogs.ts', type: 'Code Module', technology: 'TypeScript', description: 'Streams heavy debug logs to VictoriaLogs.', url: resolveCodeUrl('typebot/packages/forge/blocks/receptionist/src/victorialogs.ts'), properties: { code: 'typebot/packages/forge/blocks/receptionist/src/victorialogs.ts' } },
    };
    Object.assign(elements, codeFlowElements);

    console.log(`\x1b[32m✓ Loaded ${Object.keys(elements).length} model elements\x1b[0m`);

    if (args.validateOnly) {
      console.log(`\x1b[32m✓ Validation mode complete.\x1b[0m\n`);
      return;
    }

    console.log(`\x1b[1m[4/5] Building unified C4 diagram with collapsible subgraphs...\x1b[0m`);

    const collapsibleGroups = {};
    const { body, styles, edges, edgeGroups, overviewEdges } = buildUnifiedDiagram(ws, elements, collapsibleGroups);

    console.log(`\x1b[32m✓ Built unified diagram with ${Object.keys(collapsibleGroups).length} collapsible group(s)\x1b[0m`);

    // Assemble HTML artifact
    const templatePath = path.join(path.dirname(new URL(import.meta.url).pathname), '../assets/c4-dashboard-template.html');
    let templateHtml = await fs.readFile(templatePath, 'utf8');

    const artifactTitle = args.title || `${workspaceName} — C4 Architecture Model`;
    const artifactSubtitle = workspaceDesc || `Interactive C4 model with in-place expand/collapse`;

    const dataJson = JSON.stringify({
      workspaceName,
      workspaceDesc,
      elements,
      collapsibleGroups,
      mermaidBody: body,
      mermaidStyles: styles,
      mermaidEdges: edges,
      mermaidEdgeGroups: edgeGroups,
      mermaidOverviewEdges: overviewEdges,
    });

    let fallbackMermaid = 'flowchart-elk TB\n';
    fallbackMermaid += '  linkStyle default stroke:#475569,color:#94a3b8\n\n';
    fallbackMermaid += body + '\n\n';
    for (const groupId of Object.keys(collapsibleGroups)) {
      fallbackMermaid += `  ${groupId}@{ view: collapsed }\n`;
    }
    fallbackMermaid += '\n' + overviewEdges + '\n';
    fallbackMermaid += '\n' + styles + '\n';

    const finalHtml = templateHtml
      .replace(/{{TITLE}}/g, escapeHtml(artifactTitle))
      .replace(/{{SUBTITLE}}/g, escapeHtml(artifactSubtitle))
      .replace(/{{C4_DATA_JSON}}/g, dataJson)
      .replace(/{{MERMAID_FALLBACK}}/g, escapeHtml(fallbackMermaid));

    const artifactsDir = path.join(projectDir, '.artifacts-manager');
    await fs.mkdir(artifactsDir, { recursive: true });

    const outputPath = path.join(artifactsDir, args.output);
    await fs.writeFile(outputPath, finalHtml, 'utf8');
    console.log(`\x1b[32m✓ Wrote artifact:\x1b[0m ${outputPath}`);

    console.log(`\x1b[1m[5/5] Registering and validating with Artifacts Manager...\x1b[0m`);
    const artmanBin = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../bin/artman');

    await execFileAsync('node', [
      artmanBin, 'add',
      '--project', projectDir,
      '--id', args.id,
      '--file', args.output,
      '--title', artifactTitle,
      '--tags', 'architecture,c4,structurizr,mermaid,tailwind'
    ]);

    const { stdout: valOut } = await execFileAsync('node', [
      artmanBin, 'validate',
      '--project', projectDir
    ]);
    console.log(valOut.trim());

    console.log(`\n\x1b[32m✓ C4 Architecture Dashboard successfully generated and verified!\x1b[0m\n`);
  } finally {
    await fs.rm(stage, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error(`\x1b[31mFatal error:\x1b[0m`, err);
  process.exit(1);
});
