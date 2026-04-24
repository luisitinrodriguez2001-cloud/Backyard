document.addEventListener('DOMContentLoaded', () => {
    const mobileMediaQuery = window.matchMedia('(max-width: 900px)');
    const hasTouchCapability = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const userAgent = navigator.userAgent;
    const isMobileAppleDevice = /iPhone|iPad|iPod/.test(userAgent)
        || (/Macintosh/.test(userAgent) && hasTouchCapability);

    const MIN_GRID_SIZE = 2;
    const MAX_GRID_SIZE = 200;
    const BASE_CELL_SIZE_DESKTOP = 18;
    const BASE_CELL_SIZE_MOBILE = 14;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 2.5;
    const ZOOM_STEP_WHEEL = 0.05;
    const DESIGN_CACHE_KEY = 'backyard-designer-last-design-v1';

    const lawn = document.getElementById('lawn');
    const gridShell = document.getElementById('grid-shell');
    const clearBtn = document.getElementById('clear-btn');
    const shareCodeBtn = document.getElementById('share-code-btn');
    const sharePngBtn = document.getElementById('share-png-btn');
    const exportActions = document.getElementById('export-actions');
    const desktopControls = document.getElementById('desktop-controls');
    const mobileExportSlot = document.getElementById('mobile-export-slot');
    const mobileToolButtons = document.querySelectorAll('.mobile-tool-btn');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const categoryPanels = document.querySelectorAll('.material-category');
    const textureSizeControls = document.getElementById('texture-size-controls');
    const textureSizeTitle = document.getElementById('texture-size-title');
    const textureSizeInputs = document.querySelectorAll('input[name="texture-size"]');
    const measurementsBtn = document.getElementById('measurements-btn');
    const topRuler = document.getElementById('top-ruler');
    const leftRuler = document.getElementById('left-ruler');
    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const applyCanvasBtn = document.getElementById('apply-canvas-btn');
    const placementWidthInput = document.getElementById('placement-width');
    const placementHeightInput = document.getElementById('placement-height');
    const paintBehaviorInputs = document.querySelectorAll('input[name="paint-behavior"]');
    const tileCoverageInputs = document.querySelectorAll('input[name="tile-coverage"]');
    const customCoverageInputWrap = document.querySelector('.custom-coverage-input-wrap');
    const customCoverageInput = document.getElementById('custom-coverage-input');
    const fillOriginControls = document.getElementById('fill-origin-controls');
    const fillOriginInputs = document.querySelectorAll('input[name="fill-origin"]');
    const clearMeasurementsBtn = document.getElementById('clear-measurements-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const toggleBackgroundControlsBtn = document.getElementById('toggle-background-controls-btn');
    const backgroundControls = document.getElementById('background-controls');
    const backgroundSelect = document.getElementById('background-select');
    const toggleMaterialsBtn = document.getElementById('toggle-materials-btn');
    const materialPalette = document.getElementById('material-palette');
    const exportProgressWrap = document.getElementById('export-progress-wrap');
    const exportProgress = document.getElementById('export-progress');
    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file-input');

    let currentMobileAction = 'place';
    let currentMaterial = 'grass';
    let currentTextureSize = 'medium';
    let isMobileSafari = false;
    let gridCols = Number(canvasWidthInput.value);
    let gridRows = Number(canvasHeightInput.value);
    let zoomLevel = 1;
    let pointerAction = null;
    let pinchState = null;
    let panState = null;
    let paintBehavior = 'drag';
    let measurementModeEnabled = false;
    let measurementStartCell = null;
    let currentBackground = 'grassyard';
    let coveragePreset = '100';
    let customCoverageValue = 75;
    let fillOrigin = 'top';
    let placementWidth = 1;
    let placementHeight = 1;
    const undoStack = [];
    const redoStack = [];

    const applyMobileMode = () => {
        const isMobileFormFactor = mobileMediaQuery.matches || hasTouchCapability;
        const hasSafari = /Safari/.test(userAgent);
        const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS/.test(userAgent);
        isMobileSafari = isMobileFormFactor && isMobileAppleDevice && hasSafari && !isOtherIOSBrowser;
        document.body.classList.toggle('mobile-mode', isMobileSafari);
        applyZoom();
    };

    const SIZE_VARIANT_MATERIALS = new Set(['grass', 'white-vinyl-fence']);
    const SIZE_VARIANTS_BY_MATERIAL = {
        grass: ['small', 'medium', 'large'],
        'white-vinyl-fence': ['small', 'medium', 'large']
    };
    const MATERIAL_ALIASES = {
        'bush-round': 'bush',
        'bush-hedge': 'bush',
        edging: 'brick',
        'brick-edging': 'brick'
    };

    function normalizeMaterial(material) {
        return MATERIAL_ALIASES[material] || material;
    }

    function getValidatedTextureSize(material, requestedSize) {
        const options = SIZE_VARIANTS_BY_MATERIAL[material];
        if (!options) {
            return null;
        }

        return options.includes(requestedSize) ? requestedSize : 'medium';
    }

    function createFeature(material, textureSize = null) {
        const normalizedMaterial = normalizeMaterial(material);
        const feature = document.createElement('div');
        feature.classList.add('feature', `${normalizedMaterial}-feature`);
        feature.dataset.material = normalizedMaterial;
        if (textureSize) {
            feature.dataset.textureSize = textureSize;
            feature.classList.add(`${normalizedMaterial}-size-${textureSize}`);
        }
        return feature;
    }

    function normalizeCoveragePercent(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return 100;
        }
        return Math.max(1, Math.min(100, Math.round(parsed)));
    }

    function normalizeFillOrigin(value) {
        const allowedOrigins = new Set(['top', 'bottom', 'center']);
        return allowedOrigins.has(value) ? value : 'top';
    }

    function normalizeLayer(rawLayer) {
        if (!rawLayer || typeof rawLayer !== 'object') {
            return null;
        }
        const material = normalizeMaterial(rawLayer.material);
        if (!material) {
            return null;
        }
        return {
            material,
            textureSize: getValidatedTextureSize(material, rawLayer.textureSize) || null,
            coveragePercent: normalizeCoveragePercent(rawLayer.coveragePercent ?? 100),
            origin: normalizeFillOrigin(rawLayer.origin || 'top')
        };
    }

    function setCellLayers(cell, layers) {
        const normalizedLayers = (layers || []).map(normalizeLayer).filter(Boolean);
        cell.dataset.layers = JSON.stringify(normalizedLayers);
    }

    function getCellLayers(cell) {
        if (!cell?.dataset?.layers) {
            return [];
        }

        try {
            const parsed = JSON.parse(cell.dataset.layers);
            if (!Array.isArray(parsed)) {
                return [];
            }
            return parsed.map(normalizeLayer).filter(Boolean);
        } catch (error) {
            console.warn('Could not parse cell layers', error);
            return [];
        }
    }

    function getLayerClipPath(coveragePercent, origin) {
        const coverage = normalizeCoveragePercent(coveragePercent);
        const hidden = 100 - coverage;
        const normalizedOrigin = normalizeFillOrigin(origin);

        if (coverage === 100) {
            return 'inset(0 0 0 0)';
        }
        if (normalizedOrigin === 'bottom') {
            return `inset(${hidden}% 0 0 0)`;
        }
        if (normalizedOrigin === 'center') {
            const halfHidden = hidden / 2;
            return `inset(${halfHidden}% 0 ${halfHidden}% 0)`;
        }
        return `inset(0 0 ${hidden}% 0)`;
    }

    function renderCellLayers(cell) {
        const layers = getCellLayers(cell);
        cell.innerHTML = '';
        cell.classList.remove('has-door-top');

        layers.forEach((layer, index) => {
            if (layer.material === 'door') {
                cell.classList.add('has-door-top');
                return;
            }

            const feature = createFeature(layer.material, layer.textureSize);
            feature.style.clipPath = getLayerClipPath(layer.coveragePercent, layer.origin);
            feature.style.zIndex = String(index + 1);
            feature.dataset.coveragePercent = String(layer.coveragePercent);
            feature.dataset.fillOrigin = layer.origin;
            cell.appendChild(feature);
        });
    }

    function clearCell(cell) {
        cell.innerHTML = '';
        cell.classList.remove('has-door-top');
        delete cell.dataset.layers;
    }

    function paintMaterial(cell, material, textureSize = null, options = {}) {
        if (!cell) {
            return;
        }

        const nextLayer = normalizeLayer({
            material: normalizeMaterial(material),
            textureSize,
            coveragePercent: options.coveragePercent ?? 100,
            origin: options.origin ?? 'top'
        });
        if (!nextLayer) {
            return;
        }

        const replaceExisting = nextLayer.material === 'door' || nextLayer.coveragePercent === 100;
        const layers = replaceExisting ? [] : getCellLayers(cell);
        layers.push(nextLayer);
        setCellLayers(cell, layers);
        renderCellLayers(cell);
    }

    function parseSerializedEntry(entry) {
        if (Array.isArray(entry)) {
            const [row, col, material, textureSize = null] = entry;
            return {
                row: Number(row),
                col: Number(col),
                layers: [{ material, textureSize, coveragePercent: 100, origin: 'top' }]
            };
        }

        if (entry && typeof entry === 'object' && Array.isArray(entry.layers)) {
            return {
                row: Number(entry.row),
                col: Number(entry.col),
                layers: entry.layers
            };
        }

        return null;
    }

    function hydrateCellWithLayers(cell, layers) {
        const normalizedLayers = (layers || []).map(normalizeLayer).filter(Boolean);
        if (!normalizedLayers.length) {
            clearCell(cell);
            return;
        }
        setCellLayers(cell, normalizedLayers);
        renderCellLayers(cell);
    }

    function serializeGrid() {
        const cells = lawn.querySelectorAll('.cell');
        const entries = [];

        cells.forEach((cell) => {
            const layers = getCellLayers(cell);
            if (layers.length) {
                entries.push({
                    row: Number(cell.dataset.row),
                    col: Number(cell.dataset.col),
                    layers
                });
            }
        });

        return {
            version: 3,
            cols: gridCols,
            rows: gridRows,
            zoomLevel,
            background: currentBackground,
            measurements: serializeMeasurements(),
            entries
        };
    }

    function saveGridToCache() {
        try {
            localStorage.setItem(DESIGN_CACHE_KEY, JSON.stringify(serializeGrid()));
        } catch (error) {
            console.warn('Could not cache design', error);
        }
    }

    function loadGridFromCache() {
        const raw = localStorage.getItem(DESIGN_CACHE_KEY);
        if (!raw) {
            return false;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.entries)) {
                return false;
            }

            gridCols = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(parsed.cols) || gridCols));
            gridRows = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(parsed.rows) || gridRows));
            canvasWidthInput.value = String(gridCols);
            canvasHeightInput.value = String(gridRows);
            applyGridSizing();
            buildGrid();
            buildRulers();

            parsed.entries.forEach((entry) => {
                const serializedEntry = parseSerializedEntry(entry);
                if (!serializedEntry) {
                    return;
                }
                const cell = lawn.querySelector(`.cell[data-row="${serializedEntry.row}"][data-col="${serializedEntry.col}"]`);
                if (cell) {
                    hydrateCellWithLayers(cell, serializedEntry.layers);
                }
            });
            if (Array.isArray(parsed.measurements)) {
                parsed.measurements.forEach((measurement) => {
                    createMeasurementLineByCoords(
                        measurement.startRow,
                        measurement.startCol,
                        measurement.endRow,
                        measurement.endCol
                    );
                });
            }
            setCanvasBackground(parsed.background || currentBackground);

            if (typeof parsed.zoomLevel === 'number') {
                setZoom(parsed.zoomLevel);
            }

            return true;
        } catch (error) {
            console.warn('Could not load cached design', error);
            return false;
        }
    }

    function syncExportButtonLocation() {
        if (document.body.classList.contains('mobile-mode')) {
            mobileExportSlot.appendChild(exportActions);
        } else {
            desktopControls.appendChild(exportActions);
        }
    }

    function setCurrentMobileAction(nextAction) {
        currentMobileAction = nextAction;
        mobileToolButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.mode === nextAction);
        });
    }

    function setCurrentMaterial(nextMaterial) {
        currentMaterial = normalizeMaterial(nextMaterial);
        const materialButtons = document.querySelectorAll('.palette-btn');
        materialButtons.forEach((button) => {
            const buttonMaterial = normalizeMaterial(button.dataset.material);
            button.classList.toggle('is-active', buttonMaterial === currentMaterial);
        });
        syncTextureSizeControls();
    }

    function setActiveMaterialCategory(categoryName) {
        categoryButtons.forEach((button) => {
            const isActive = button.dataset.category === categoryName;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', String(isActive));
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        categoryPanels.forEach((panel) => {
            const shouldHide = panel.dataset.categoryPanel !== categoryName;
            panel.classList.toggle('is-hidden', shouldHide);
            panel.setAttribute('aria-hidden', String(shouldHide));
        });
    }

    function handleCategoryToggle(categoryName) {
        if (!categoryName) {
            return;
        }
        setActiveMaterialCategory(categoryName);
    }

    function getCurrentCoveragePercent() {
        if (coveragePreset === 'custom') {
            return normalizeCoveragePercent(customCoverageValue);
        }
        return normalizeCoveragePercent(coveragePreset);
    }

    function refreshCoverageControls() {
        const isCustom = coveragePreset === 'custom';
        const coveragePercent = getCurrentCoveragePercent();
        customCoverageInputWrap.classList.toggle('is-hidden', !isCustom);
        fillOriginControls.classList.toggle('is-hidden', coveragePercent === 100);
        if (isCustom) {
            customCoverageInput.value = String(coveragePercent);
        }
    }

    function setCoveragePreset(nextPreset) {
        coveragePreset = nextPreset;
        tileCoverageInputs.forEach((input) => {
            input.checked = input.value === nextPreset;
        });
        refreshCoverageControls();
    }

    function setCustomCoverageValue(nextValue, options = {}) {
        const { preserveInput = false } = options;
        const rawValue = typeof nextValue === 'string' ? nextValue.trim() : String(nextValue);

        if (rawValue === '') {
            if (!preserveInput) {
                customCoverageInput.value = String(customCoverageValue);
            }
            refreshCoverageControls();
            return;
        }

        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
            if (!preserveInput) {
                customCoverageInput.value = String(customCoverageValue);
            }
            refreshCoverageControls();
            return;
        }

        customCoverageValue = normalizeCoveragePercent(parsed);
        customCoverageInput.value = String(customCoverageValue);
        refreshCoverageControls();
    }

    function setFillOrigin(nextOrigin) {
        fillOrigin = normalizeFillOrigin(nextOrigin);
        fillOriginInputs.forEach((input) => {
            input.checked = input.value === fillOrigin;
        });
    }

    function syncTextureSizeControls() {
        const showSizePicker = SIZE_VARIANT_MATERIALS.has(currentMaterial);
        textureSizeControls.classList.toggle('is-hidden', !showSizePicker);
        if (!showSizePicker) {
            return;
        }

        const isGrass = currentMaterial === 'grass';
        textureSizeTitle.textContent = isGrass ? 'Grass Texture Size' : 'Vinyl Texture Size';
        const nextSize = getValidatedTextureSize(currentMaterial, currentTextureSize) || 'medium';
        currentTextureSize = nextSize;
        textureSizeInputs.forEach((input) => {
            input.checked = input.value === nextSize;
        });
    }

    function applyGridSizing() {
        lawn.style.setProperty('--grid-cols', gridCols);
        lawn.style.setProperty('--grid-rows', gridRows);
        gridShell.style.setProperty('--grid-cols', gridCols);
        gridShell.style.setProperty('--grid-rows', gridRows);
    }

    function normalizePlacementDimension(value) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return 1;
        }
        return Math.max(1, Math.min(50, Math.round(parsed)));
    }

    function setPlacementSize(nextWidth, nextHeight) {
        placementWidth = normalizePlacementDimension(nextWidth);
        placementHeight = normalizePlacementDimension(nextHeight);
        placementWidthInput.value = String(placementWidth);
        placementHeightInput.value = String(placementHeight);
    }

    function getCellsInPlacementArea(startCell) {
        if (!startCell) {
            return [];
        }
        const startRow = Number(startCell.dataset.row);
        const startCol = Number(startCell.dataset.col);
        const maxCol = Math.min(gridCols, startCol + placementWidth - 1);
        const maxRow = Math.min(gridRows, startRow + placementHeight - 1);
        const areaCells = [];

        for (let row = startRow; row <= maxRow; row++) {
            for (let col = startCol; col <= maxCol; col++) {
                const cell = lawn.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    areaCells.push(cell);
                }
            }
        }

        return areaCells;
    }

    function getStateSnapshot() {
        return serializeGrid();
    }

    function updateHistoryButtons() {
        const canUndo = undoStack.length > 0;
        const canRedo = redoStack.length > 0;
        undoBtn.classList.toggle('is-disabled', !canUndo);
        redoBtn.classList.toggle('is-disabled', !canRedo);
        undoBtn.setAttribute('aria-disabled', String(!canUndo));
        redoBtn.setAttribute('aria-disabled', String(!canRedo));
    }

    function pushUndoState() {
        undoStack.push(getStateSnapshot());
        redoStack.length = 0;
        updateHistoryButtons();
    }

    function restoreState(state) {
        if (!state || !Array.isArray(state.entries)) {
            return;
        }

        gridCols = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(state.cols) || gridCols));
        gridRows = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(state.rows) || gridRows));
        canvasWidthInput.value = String(gridCols);
        canvasHeightInput.value = String(gridRows);
        applyGridSizing();
        buildGrid();
        buildRulers();

        state.entries.forEach((entry) => {
            const serializedEntry = parseSerializedEntry(entry);
            if (!serializedEntry) {
                return;
            }
            const cell = lawn.querySelector(`.cell[data-row="${serializedEntry.row}"][data-col="${serializedEntry.col}"]`);
            if (cell) {
                hydrateCellWithLayers(cell, serializedEntry.layers);
            }
        });

        if (Array.isArray(state.measurements)) {
            state.measurements.forEach((measurement) => {
                createMeasurementLineByCoords(
                    measurement.startRow,
                    measurement.startCol,
                    measurement.endRow,
                    measurement.endCol
                );
            });
        }

        setCanvasBackground(state.background || 'grassyard');
        if (typeof state.zoomLevel === 'number') {
            setZoom(state.zoomLevel);
        }
        saveGridToCache();
    }

    function undo() {
        if (!undoStack.length) {
            return;
        }
        redoStack.push(getStateSnapshot());
        const previousState = undoStack.pop();
        restoreState(previousState);
        updateHistoryButtons();
    }

    function redo() {
        if (!redoStack.length) {
            return;
        }
        undoStack.push(getStateSnapshot());
        const nextState = redoStack.pop();
        restoreState(nextState);
        updateHistoryButtons();
    }

    function buildRulers() {
        topRuler.innerHTML = '';
        leftRuler.innerHTML = '';

        for (let col = 1; col <= gridCols; col++) {
            const tick = document.createElement('span');
            tick.textContent = col;
            topRuler.appendChild(tick);
        }

        for (let row = 1; row <= gridRows; row++) {
            const tick = document.createElement('span');
            tick.textContent = row;
            leftRuler.appendChild(tick);
        }
    }

    function buildGrid() {
        lawn.innerHTML = '';
        resetMeasurementSelection();
        const totalCells = gridCols * gridRows;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < totalCells; i++) {
            const row = Math.floor(i / gridCols) + 1;
            const col = (i % gridCols) + 1;
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = row;
            cell.dataset.col = col;
            fragment.appendChild(cell);
        }

        lawn.appendChild(fragment);
        getMeasurementLayer();
    }

    function updateCanvasSize() {
        const previousState = getStateSnapshot();
        const nextCols = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(canvasWidthInput.value) || gridCols));
        const nextRows = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(canvasHeightInput.value) || gridRows));

        gridCols = nextCols;
        gridRows = nextRows;
        canvasWidthInput.value = String(gridCols);
        canvasHeightInput.value = String(gridRows);

        applyGridSizing();
        buildGrid();
        buildRulers();

        previousState.entries.forEach((entry) => {
            const serializedEntry = parseSerializedEntry(entry);
            if (!serializedEntry) {
                return;
            }
            if (serializedEntry.col > nextCols || serializedEntry.row > nextRows) {
                return;
            }
            const cell = lawn.querySelector(`.cell[data-row="${serializedEntry.row}"][data-col="${serializedEntry.col}"]`);
            if (cell) {
                hydrateCellWithLayers(cell, serializedEntry.layers);
            }
        });

        previousState.measurements.forEach((measurement) => {
            const withinBounds = measurement.startRow <= nextRows
                && measurement.endRow <= nextRows
                && measurement.startCol <= nextCols
                && measurement.endCol <= nextCols;
            if (withinBounds) {
                createMeasurementLineByCoords(
                    measurement.startRow,
                    measurement.startCol,
                    measurement.endRow,
                    measurement.endCol
                );
            }
        });
        saveGridToCache();
    }

    function applyZoom() {
        const effectiveCellSize = getEffectiveCellSize(zoomLevel);
        document.documentElement.style.setProperty('--cell-size', `${effectiveCellSize}px`);
        redrawMeasurements();
    }

    function getEffectiveCellSize(zoom) {
        const baseCellSize = document.body.classList.contains('mobile-mode')
            ? BASE_CELL_SIZE_MOBILE
            : BASE_CELL_SIZE_DESKTOP;
        return Math.round(baseCellSize * zoom);
    }

    function setZoom(nextZoom, anchorClientPoint = null) {
        const previousCellSize = getEffectiveCellSize(zoomLevel);
        zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
        applyZoom();

        if (!anchorClientPoint || !previousCellSize) {
            return;
        }

        const nextCellSize = getEffectiveCellSize(zoomLevel);
        if (!nextCellSize || nextCellSize === previousCellSize) {
            return;
        }

        const shellRect = gridShell.getBoundingClientRect();
        const anchorX = anchorClientPoint.x - shellRect.left;
        const anchorY = anchorClientPoint.y - shellRect.top;
        const scaleRatio = nextCellSize / previousCellSize;

        const contentX = gridShell.scrollLeft + anchorX;
        const contentY = gridShell.scrollTop + anchorY;
        const nextScrollLeft = (contentX * scaleRatio) - anchorX;
        const nextScrollTop = (contentY * scaleRatio) - anchorY;

        gridShell.scrollLeft = Math.max(0, nextScrollLeft);
        gridShell.scrollTop = Math.max(0, nextScrollTop);
    }

    function handlePaint(targetCell) {
        if (!targetCell) {
            return;
        }

        const sizeSelection = SIZE_VARIANT_MATERIALS.has(currentMaterial) ? currentTextureSize : null;
        const targetCells = getCellsInPlacementArea(targetCell);
        targetCells.forEach((cell) => {
            paintMaterial(cell, currentMaterial, sizeSelection, {
                coveragePercent: getCurrentCoveragePercent(),
                origin: fillOrigin
            });
        });
    }

    function handleRemove(targetCell) {
        if (!targetCell) {
            return;
        }

        const targetCells = getCellsInPlacementArea(targetCell);
        targetCells.forEach((cell) => clearCell(cell));
    }

    function applyPointerAction(cell) {
        if (!cell || !pointerAction) {
            return;
        }

        if (pointerAction === 'paint') {
            handlePaint(cell);
        } else {
            handleRemove(cell);
        }
    }

    function readCellFromPointerEvent(event) {
        const target = document.elementFromPoint(event.clientX, event.clientY);
        return target?.closest?.('.cell') || null;
    }

    function resetMeasurementSelection() {
        if (measurementStartCell) {
            measurementStartCell.classList.remove('measurement-start');
        }
        measurementStartCell = null;
    }

    function getMeasurementLayer() {
        let layer = lawn.querySelector('.measurement-layer');
        if (!layer) {
            layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            layer.classList.add('measurement-layer');
            layer.setAttribute('aria-hidden', 'true');
            lawn.appendChild(layer);
        }

        layer.style.zIndex = '9999';

        if (!layer.parentElement || layer.parentElement !== lawn) {
            lawn.appendChild(layer);
        }

        const width = lawn.clientWidth;
        const height = lawn.clientHeight;
        layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
        layer.setAttribute('width', String(width));
        layer.setAttribute('height', String(height));
        return layer;
    }

    function getCellCenter(cell) {
        return {
            x: cell.offsetLeft + (cell.clientWidth / 2),
            y: cell.offsetTop + (cell.clientHeight / 2)
        };
    }

    function createMeasurementLine(startCell, endCell) {
        createMeasurementLineByCoords(
            Number(startCell.dataset.row),
            Number(startCell.dataset.col),
            Number(endCell.dataset.row),
            Number(endCell.dataset.col)
        );
    }

    function createMeasurementLineByCoords(startRow, startCol, endRow, endCol) {
        const startCell = lawn.querySelector(`.cell[data-row="${startRow}"][data-col="${startCol}"]`);
        const endCell = lawn.querySelector(`.cell[data-row="${endRow}"][data-col="${endCol}"]`);
        if (!startCell || !endCell) {
            return;
        }

        const layer = getMeasurementLayer();
        const start = getCellCenter(startCell);
        const end = getCellCenter(endCell);
        const deltaCols = endCol - startCol;
        const deltaRows = endRow - startRow;
        const distanceFeet = Math.hypot(deltaCols, deltaRows);
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('measurement-item');
        group.dataset.startRow = String(startRow);
        group.dataset.startCol = String(startCol);
        group.dataset.endRow = String(endRow);
        group.dataset.endCol = String(endCol);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(start.x));
        line.setAttribute('y1', String(start.y));
        line.setAttribute('x2', String(end.x));
        line.setAttribute('y2', String(end.y));

        const startDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        startDot.setAttribute('cx', String(start.x));
        startDot.setAttribute('cy', String(start.y));
        startDot.setAttribute('r', '3');

        const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endDot.setAttribute('cx', String(end.x));
        endDot.setAttribute('cy', String(end.y));
        endDot.setAttribute('r', '3');

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(midX));
        label.setAttribute('y', String(midY - 6));
        label.textContent = `${distanceFeet.toFixed(1)} ft`;

        group.append(line, startDot, endDot, label);
        layer.appendChild(group);
    }

    function redrawMeasurements() {
        const layer = lawn.querySelector('.measurement-layer');
        if (!layer) {
            return;
        }

        const measurements = serializeMeasurements();
        layer.innerHTML = '';
        measurements.forEach((measurement) => {
            createMeasurementLineByCoords(
                measurement.startRow,
                measurement.startCol,
                measurement.endRow,
                measurement.endCol
            );
        });
    }

    function serializeMeasurements() {
        const layer = lawn.querySelector('.measurement-layer');
        if (!layer) {
            return [];
        }
        return Array.from(layer.querySelectorAll('.measurement-item')).map((item) => ({
            startRow: Number(item.dataset.startRow),
            startCol: Number(item.dataset.startCol),
            endRow: Number(item.dataset.endRow),
            endCol: Number(item.dataset.endCol)
        }));
    }

    function clearMeasurements() {
        const layer = lawn.querySelector('.measurement-layer');
        if (layer) {
            layer.innerHTML = '';
        }
        resetMeasurementSelection();
    }

    function setCanvasBackground(backgroundName) {
        currentBackground = backgroundName;
        gridShell.dataset.background = backgroundName;
        lawn.dataset.background = backgroundName;
        backgroundSelect.value = backgroundName;
        const selectedOption = backgroundSelect.options[backgroundSelect.selectedIndex];
        if (selectedOption) {
            toggleBackgroundControlsBtn.textContent = `Change Background (${selectedOption.text})`;
        }
    }

    function setMaterialsVisibility(isVisible) {
        materialPalette.classList.toggle('is-hidden', !isVisible);
        toggleMaterialsBtn.textContent = isVisible ? 'Hide Materials' : 'Show Materials';
    }

    function setMeasurementMode(nextEnabled) {
        measurementModeEnabled = nextEnabled;
        measurementsBtn.classList.toggle('is-active', measurementModeEnabled);
        measurementsBtn.textContent = measurementModeEnabled ? 'Exit Measure Mode' : 'Show Measurements';

        if (!measurementModeEnabled) {
            resetMeasurementSelection();
        }
    }

    function isMeasurementInteractionPaused() {
        return measurementModeEnabled && paintBehavior === 'off';
    }

    function isZoomInteractionEnabled() {
        return paintBehavior === 'off';
    }

    function handleMeasurementClick(cell) {
        if (!measurementModeEnabled || !cell) {
            return;
        }

        if (!measurementStartCell) {
            measurementStartCell = cell;
            measurementStartCell.classList.add('measurement-start');
            return;
        }

        if (measurementStartCell === cell) {
            resetMeasurementSelection();
            return;
        }

        pushUndoState();
        createMeasurementLine(measurementStartCell, cell);
        saveGridToCache();
        resetMeasurementSelection();
    }

    function getPointerAction(event) {
        if (paintBehavior === 'off') {
            return null;
        }

        if (event.pointerType === 'mouse' && event.button === 2) {
            return 'erase';
        }

        if (isMobileSafari) {
            return currentMobileAction === 'place' ? 'paint' : 'erase';
        }

        return 'paint';
    }

    function getPinchDistance(first, second) {
        return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    }

    function beginPan(event) {
        panState = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startScrollLeft: gridShell.scrollLeft,
            startScrollTop: gridShell.scrollTop
        };
        lawn.setPointerCapture(event.pointerId);
        lawn.classList.add('is-panning');
    }

    function updatePan(event) {
        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - panState.startX;
        const deltaY = event.clientY - panState.startY;
        gridShell.scrollLeft = panState.startScrollLeft - deltaX;
        gridShell.scrollTop = panState.startScrollTop - deltaY;
    }

    function endPan(pointerId = null) {
        if (!panState || (pointerId !== null && panState.pointerId !== pointerId)) {
            return;
        }

        panState = null;
        lawn.classList.remove('is-panning');
    }

    function bindMediaQueryChangeListener(mediaQueryList, handler) {
        if (typeof mediaQueryList.addEventListener === 'function') {
            mediaQueryList.addEventListener('change', handler);
            return;
        }

        if (typeof mediaQueryList.addListener === 'function') {
            mediaQueryList.addListener(handler);
        }
    }

    function wait(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }

    function encodeDesignState(state) {
        const json = JSON.stringify(state);
        const encoded = btoa(unescape(encodeURIComponent(json)));
        return `BYD1:${encoded}`;
    }

    function decodeDesignState(codeText) {
        const trimmed = codeText.trim();
        const payload = trimmed.startsWith('BYD1:') ? trimmed.slice(5) : trimmed;
        const json = decodeURIComponent(escape(atob(payload)));
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.entries)) {
            throw new Error('Invalid design code.');
        }
        return parsed;
    }

    function getBackgroundPalette(backgroundName) {
        const palettes = {
            grassyard: { base: '#2d4c1e', accentA: '#3a5e28', accentB: '#29461b' },
            sandlot: { base: '#c7a86d', accentA: '#e6c892', accentB: '#8d6c3d' },
            stonepatio: { base: '#7d8288', accentA: '#a6abb0', accentB: '#666b70' },
            mulchbed: { base: '#5a3d27', accentA: '#7a5537', accentB: '#3d2819' },
            waterbg: { base: '#0ea5e9', accentA: '#38bdf8', accentB: '#1d4ed8' },
            snowfield: { base: '#e2e8f0', accentA: '#f8fafc', accentB: '#cbd5e1' },
            wooddeckbg: { base: '#7c2d12', accentA: '#9a3412', accentB: '#431407' }
        };

        return palettes[backgroundName] || palettes.grassyard;
    }

    function getMaterialFill(material) {
        const materialColors = {
            grass: '#2f7d32',
            turf: '#3f8f4b',
            landscaping: '#6b3f1f',
            sand: '#d4b06a',
            gravel: '#9ca3af',
            'river-rocks': '#6b7280',
            flowers: '#db2777',
            mulch: '#7c2d12',
            deck: '#7c2d12',
            wood: '#8b5a2b',
            concrete: '#9ca3af',
            pavers: '#8b7d6b',
            brick: '#9f3c2f',
            stone: '#6b7280',
            asphalt: '#374151',
            tile: '#cbd5e1',
            plastic: '#4b5563',
            'white-vinyl-fence': '#f8fafc',
            door: '#92400e',
            gazebo: '#94a3b8',
            pergola: '#a16207',
            'pool-tile': '#0ea5e9',
            water: '#38bdf8',
            'sprinkler-head': '#334155',
            grill: '#1f2937',
            firepit: '#b45309',
            'solar-panel': '#1e3a8a',
            'path-light': '#facc15',
            bush: '#3f6212',
            tree: '#166534',
            palm: '#15803d',
            cactus: '#65a30d',
            succulent: '#10b981',
            moss: '#4d7c0f',
            frog: '#22c55e',
            dog: '#92400e',
            cat: '#a16207',
            bird: '#2563eb',
            butterfly: '#ec4899',
            fish: '#0ea5e9',
            bench: '#78350f',
            statue: '#94a3b8',
            'stepping-stones': '#6b7280',
            planter: '#854d0e',
            playground: '#dc2626',
            fountain: '#38bdf8'
        };

        return materialColors[material] || '#475569';
    }

    function drawDesignBackground(ctx, width, height, backgroundName) {
        const palette = getBackgroundPalette(backgroundName);
        ctx.fillStyle = palette.base;
        ctx.fillRect(0, 0, width, height);

        const spacing = 24;
        for (let y = 0; y < height + spacing; y += spacing) {
            for (let x = 0; x < width + spacing; x += spacing) {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath();
                ctx.arc(x + 6, y + 6, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = palette.accentA;
                ctx.fillRect(x + 12, y + 12, 2, 2);
                ctx.fillStyle = palette.accentB;
                ctx.fillRect(x + 16, y + 4, 1.5, 1.5);
            }
        }
    }

    async function buildDesignPreviewBlob(state) {
        const exportCellSize = 24;
        const width = state.cols * exportCellSize;
        const height = state.rows * exportCellSize;
        const canvas = document.createElement('canvas');
        // Add a 1px bleed so the final right/bottom grid stroke is not clipped.
        canvas.width = width + 1;
        canvas.height = height + 1;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas rendering unavailable');
        }

        drawDesignBackground(ctx, width, height, state.background || 'grassyard');

        state.entries.forEach((entry) => {
            const baseX = Number(entry.col) * exportCellSize;
            const baseY = Number(entry.row) * exportCellSize;
            const layers = Array.isArray(entry.layers) ? entry.layers.map(normalizeLayer).filter(Boolean) : [];

            layers.forEach((layer) => {
                const coveragePercent = normalizeCoveragePercent(layer.coveragePercent ?? 100);
                const fillHeight = exportCellSize * (coveragePercent / 100);
                let y = baseY;
                if (layer.origin === 'bottom') {
                    y = baseY + (exportCellSize - fillHeight);
                } else if (layer.origin === 'center') {
                    y = baseY + ((exportCellSize - fillHeight) / 2);
                }
                ctx.fillStyle = getMaterialFill(layer.material);
                ctx.fillRect(baseX, y, exportCellSize, fillHeight);
            });
        });

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= width; x += exportCellSize) {
            ctx.beginPath();
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += exportCellSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + 0.5);
            ctx.lineTo(width, y + 0.5);
            ctx.stroke();
        }

        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png');
        });
        if (!blob) {
            throw new Error('Could not generate design preview image');
        }
        return blob;
    }

    async function runExportFlow(action = 'code') {
        const targetBtn = action === 'png' ? sharePngBtn : shareCodeBtn;
        const idleLabel = action === 'png' ? 'Share PNG Preview' : 'Share Design Code';

        shareCodeBtn.disabled = true;
        sharePngBtn.disabled = true;
        targetBtn.textContent = 'Preparing...';
        exportProgressWrap.classList.remove('is-hidden');
        exportProgress.value = 10;
        await wait(40);

        const state = serializeGrid();
        exportProgress.value = 45;
        await wait(40);

        const code = encodeDesignState(state);
        let previewBlob = null;
        if (action === 'png') {
            exportProgress.value = 70;
            await wait(40);
            previewBlob = await buildDesignPreviewBlob(state);
        }

        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(code);
            } catch (error) {
                console.warn('Could not copy code to clipboard', error);
            }
        }

        exportProgress.value = 80;
        await wait(40);

        if (action === 'png' && previewBlob) {
            const previewFile = new File([previewBlob], 'backyard-design-preview.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [previewFile] })) {
                try {
                    await navigator.share({
                        files: [previewFile],
                        title: 'Backyard Design PNG Preview'
                    });
                } catch (error) {
                    console.log('Share canceled by user');
                }
            } else {
                const url = URL.createObjectURL(previewBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'backyard-design-preview.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                alert('PNG preview downloaded.');
            }
        } else {
            const codeBlob = new Blob([code], { type: 'text/plain' });
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Backyard Design Code',
                        text: code
                    });
                } catch (error) {
                    console.log('Share canceled by user');
                }
            } else {
                const url = URL.createObjectURL(codeBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'backyard-design-code.txt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                alert('Design code downloaded.');
            }
        }

        exportProgress.value = 100;
        await wait(150);
        exportProgressWrap.classList.add('is-hidden');
        exportProgress.value = 0;
        shareCodeBtn.textContent = 'Share Design Code';
        sharePngBtn.textContent = 'Share PNG Preview';
        targetBtn.textContent = idleLabel;
        shareCodeBtn.disabled = false;
        sharePngBtn.disabled = false;
    }

    applyMobileMode();
    bindMediaQueryChangeListener(mobileMediaQuery, applyMobileMode);
    bindMediaQueryChangeListener(mobileMediaQuery, syncExportButtonLocation);

    mobileToolButtons.forEach((button) => {
        button.addEventListener('click', () => setCurrentMobileAction(button.dataset.mode));
    });

    categoryButtons.forEach((button) => {
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(button.classList.contains('is-active')));
        button.addEventListener('click', () => handleCategoryToggle(button.dataset.category));
        button.addEventListener('pointerup', () => handleCategoryToggle(button.dataset.category));
    });

    categoryPanels.forEach((panel) => {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-hidden', String(panel.classList.contains('is-hidden')));
    });

    document.querySelectorAll('.palette-btn').forEach((button) => {
        button.addEventListener('click', () => setCurrentMaterial(button.dataset.material));
    });

    textureSizeInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            currentTextureSize = input.value;
        });
    });

    measurementsBtn.addEventListener('click', () => {
        setMeasurementMode(!measurementModeEnabled);
    });

    paintBehaviorInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            paintBehavior = input.value;
            pointerAction = null;
            endPan();
        });
    });

    tileCoverageInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            setCoveragePreset(input.value);
        });
    });

    customCoverageInput.addEventListener('focus', () => {
        setCoveragePreset('custom');
    });

    customCoverageInput.addEventListener('input', () => {
        setCoveragePreset('custom');
        setCustomCoverageValue(customCoverageInput.value, { preserveInput: true });
    });

    customCoverageInput.addEventListener('change', () => {
        setCoveragePreset('custom');
        setCustomCoverageValue(customCoverageInput.value);
    });

    customCoverageInput.addEventListener('blur', () => {
        setCustomCoverageValue(customCoverageInput.value);
    });

    placementWidthInput.addEventListener('change', () => {
        setPlacementSize(placementWidthInput.value, placementHeight);
    });

    placementHeightInput.addEventListener('change', () => {
        setPlacementSize(placementWidth, placementHeightInput.value);
    });

    fillOriginInputs.forEach((input) => {
        input.addEventListener('change', () => {
            if (!input.checked) {
                return;
            }
            setFillOrigin(input.value);
        });
    });

    applyCanvasBtn.addEventListener('click', () => {
        pushUndoState();
        updateCanvasSize();
    });

    toggleBackgroundControlsBtn.addEventListener('click', () => {
        pushUndoState();
        const options = Array.from(backgroundSelect.options).map((option) => option.value);
        const currentIndex = options.indexOf(currentBackground);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % options.length : 0;
        setCanvasBackground(options[nextIndex]);
        saveGridToCache();
        backgroundControls.classList.remove('is-hidden');
    });

    toggleMaterialsBtn.addEventListener('click', () => {
        const isHidden = materialPalette.classList.contains('is-hidden');
        setMaterialsVisibility(isHidden);
    });

    backgroundSelect.addEventListener('change', () => {
        pushUndoState();
        setCanvasBackground(backgroundSelect.value);
        saveGridToCache();
    });

    gridShell.addEventListener('wheel', (event) => {
        event.preventDefault();
        if (!isZoomInteractionEnabled()) {
            return;
        }

        const direction = event.deltaY > 0 ? -1 : 1;
        setZoom(zoomLevel + (direction * ZOOM_STEP_WHEEL), { x: event.clientX, y: event.clientY });
    }, { passive: false });

    lawn.addEventListener('pointerdown', (event) => {
        const cell = readCellFromPointerEvent(event);

        if (measurementModeEnabled && !isMeasurementInteractionPaused()) {
            handleMeasurementClick(cell);
            return;
        }

        pointerAction = getPointerAction(event);
        if (!pointerAction) {
            if (paintBehavior === 'off') {
                beginPan(event);
            }
            return;
        }

        pushUndoState();
        lawn.setPointerCapture(event.pointerId);
        applyPointerAction(cell);

        if (paintBehavior === 'single') {
            saveGridToCache();
            pointerAction = null;
        }
    });

    lawn.addEventListener('pointermove', (event) => {
        if (panState) {
            updatePan(event);
            return;
        }

        if (!pointerAction || paintBehavior !== 'drag') {
            return;
        }
        applyPointerAction(readCellFromPointerEvent(event));
    });

    lawn.addEventListener('pointerup', (event) => {
        endPan(event.pointerId);
        if (pointerAction) {
            saveGridToCache();
        }
        pointerAction = null;
    });

    lawn.addEventListener('pointercancel', (event) => {
        endPan(event.pointerId);
        pointerAction = null;
    });

    lawn.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    gridShell.addEventListener('touchstart', (event) => {
        if (!isZoomInteractionEnabled()) {
            pinchState = null;
            return;
        }

        if (event.touches.length === 2) {
            pinchState = {
                distance: getPinchDistance(event.touches[0], event.touches[1]),
                zoom: zoomLevel
            };
        }
    }, { passive: false });

    gridShell.addEventListener('touchmove', (event) => {
        if (!isZoomInteractionEnabled()) {
            pinchState = null;
            return;
        }

        if (event.touches.length !== 2 || !pinchState) {
            return;
        }

        event.preventDefault();
        const nextDistance = getPinchDistance(event.touches[0], event.touches[1]);
        if (!nextDistance || !pinchState.distance) {
            return;
        }

        const ratio = nextDistance / pinchState.distance;
        const midPoint = {
            x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
            y: (event.touches[0].clientY + event.touches[1].clientY) / 2
        };
        setZoom(pinchState.zoom * ratio, midPoint);
    }, { passive: false });

    gridShell.addEventListener('touchend', () => {
        if (pinchState) {
            saveGridToCache();
        }
        pinchState = null;
    });

    clearBtn.addEventListener('click', () => {
        pushUndoState();
        const cells = lawn.querySelectorAll('.cell');
        cells.forEach((cell) => clearCell(cell));
        clearMeasurements();
        saveGridToCache();
    });

    clearMeasurementsBtn.addEventListener('click', () => {
        pushUndoState();
        clearMeasurements();
        saveGridToCache();
    });

    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);

    shareCodeBtn.addEventListener('click', async () => {
        try {
            await runExportFlow('code');
        } catch (error) {
            console.error('Error exporting design code:', error);
            alert('Sorry, there was an issue exporting the design code.');
            exportProgressWrap.classList.add('is-hidden');
            exportProgress.value = 0;
            shareCodeBtn.textContent = 'Share Design Code';
            sharePngBtn.textContent = 'Share PNG Preview';
            shareCodeBtn.disabled = false;
            sharePngBtn.disabled = false;
        }
    });

    sharePngBtn.addEventListener('click', async () => {
        try {
            await runExportFlow('png');
        } catch (error) {
            console.error('Error exporting design PNG:', error);
            alert('Sorry, there was an issue exporting the design PNG.');
            exportProgressWrap.classList.add('is-hidden');
            exportProgress.value = 0;
            shareCodeBtn.textContent = 'Share Design Code';
            sharePngBtn.textContent = 'Share PNG Preview';
            shareCodeBtn.disabled = false;
            sharePngBtn.disabled = false;
        }
    });

    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', async () => {
        const [file] = importFileInput.files || [];
        if (!file) {
            return;
        }

        try {
            const text = await file.text();
            const importedState = decodeDesignState(text);
            pushUndoState();
            restoreState(importedState);
        } catch (error) {
            console.error('Could not import design code:', error);
            alert('The uploaded file does not contain a valid design code.');
        } finally {
            importFileInput.value = '';
        }
    });

    applyGridSizing();
    buildGrid();
    buildRulers();
    setCurrentMobileAction(currentMobileAction);
    setActiveMaterialCategory('landscaping');
    setCurrentMaterial(currentMaterial);
    setCoveragePreset(coveragePreset);
    setCustomCoverageValue(customCoverageValue);
    setFillOrigin(fillOrigin);
    setPlacementSize(placementWidth, placementHeight);
    setMaterialsVisibility(false);
    setMeasurementMode(false);
    setZoom(1);
    setCanvasBackground(currentBackground);
    syncExportButtonLocation();
    loadGridFromCache();
    updateHistoryButtons();
});
