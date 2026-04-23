document.addEventListener('DOMContentLoaded', () => {
    const mobileMediaQuery = window.matchMedia('(max-width: 900px)');
    const hasTouchCapability = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const userAgent = navigator.userAgent;
    const isMobileAppleDevice = /iPhone|iPad|iPod/.test(userAgent)
        || (/Macintosh/.test(userAgent) && hasTouchCapability);

    const MIN_GRID_SIZE = 10;
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
    const exportBtn = document.getElementById('export-btn');
    const desktopControls = document.getElementById('desktop-controls');
    const mobileExportSlot = document.getElementById('mobile-export-slot');
    const mobileToolButtons = document.querySelectorAll('.mobile-tool-btn');
    const materialButtons = document.querySelectorAll('.palette-btn');
    const measurementsBtn = document.getElementById('measurements-btn');
    const loadLastDesignBtn = document.getElementById('load-last-design-btn');
    const topRuler = document.getElementById('top-ruler');
    const leftRuler = document.getElementById('left-ruler');
    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const applyCanvasBtn = document.getElementById('apply-canvas-btn');

    let currentMobileAction = 'place';
    let currentMaterial = 'deck';
    let isMobileSafari = false;
    let gridCols = Number(canvasWidthInput.value);
    let gridRows = Number(canvasHeightInput.value);
    let zoomLevel = 1;
    let pointerAction = null;
    let pinchState = null;

    const applyMobileMode = () => {
        const isMobileFormFactor = mobileMediaQuery.matches || hasTouchCapability;
        const hasSafari = /Safari/.test(userAgent);
        const isOtherIOSBrowser = /CriOS|FxiOS|EdgiOS/.test(userAgent);
        isMobileSafari = isMobileFormFactor && isMobileAppleDevice && hasSafari && !isOtherIOSBrowser;
        document.body.classList.toggle('mobile-mode', isMobileSafari);
        applyZoom();
    };

    function createFeature(material) {
        const feature = document.createElement('div');
        feature.classList.add('feature', `${material}-feature`);
        feature.dataset.material = material;
        return feature;
    }

    function clearCell(cell) {
        cell.innerHTML = '';
        cell.classList.remove('has-door-top');
    }

    function paintMaterial(cell, material) {
        if (!cell) {
            return;
        }

        clearCell(cell);

        if (material === 'door') {
            cell.classList.add('has-door-top');
            return;
        }

        cell.appendChild(createFeature(material));
    }

    function serializeGrid() {
        const cells = lawn.querySelectorAll('.cell');
        const entries = [];

        cells.forEach((cell) => {
            if (cell.classList.contains('has-door-top')) {
                entries.push([Number(cell.dataset.row), Number(cell.dataset.col), 'door']);
                return;
            }

            const feature = cell.querySelector('.feature');
            if (feature?.dataset.material) {
                entries.push([Number(cell.dataset.row), Number(cell.dataset.col), feature.dataset.material]);
            }
        });

        return {
            version: 1,
            cols: gridCols,
            rows: gridRows,
            zoomLevel,
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

            parsed.entries.forEach(([row, col, material]) => {
                const cell = lawn.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    paintMaterial(cell, material);
                }
            });

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
            mobileExportSlot.appendChild(exportBtn);
        } else {
            desktopControls.appendChild(exportBtn);
        }
    }

    function setCurrentMobileAction(nextAction) {
        currentMobileAction = nextAction;
        mobileToolButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.mode === nextAction);
        });
    }

    function setCurrentMaterial(nextMaterial) {
        currentMaterial = nextMaterial;
        materialButtons.forEach((button) => {
            button.classList.toggle('is-active', button.dataset.material === nextMaterial);
        });
    }

    function applyGridSizing() {
        lawn.style.setProperty('--grid-cols', gridCols);
        lawn.style.setProperty('--grid-rows', gridRows);
        gridShell.style.setProperty('--grid-cols', gridCols);
        gridShell.style.setProperty('--grid-rows', gridRows);
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
    }

    function updateCanvasSize() {
        const nextCols = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(canvasWidthInput.value) || gridCols));
        const nextRows = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Number(canvasHeightInput.value) || gridRows));

        gridCols = nextCols;
        gridRows = nextRows;
        canvasWidthInput.value = String(gridCols);
        canvasHeightInput.value = String(gridRows);

        applyGridSizing();
        buildGrid();
        buildRulers();
        saveGridToCache();
    }

    function applyZoom() {
        const baseCellSize = document.body.classList.contains('mobile-mode')
            ? BASE_CELL_SIZE_MOBILE
            : BASE_CELL_SIZE_DESKTOP;
        const effectiveCellSize = Math.round(baseCellSize * zoomLevel);
        document.documentElement.style.setProperty('--cell-size', `${effectiveCellSize}px`);
    }

    function setZoom(nextZoom) {
        zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
        applyZoom();
    }

    function handlePaint(targetCell) {
        if (!targetCell) {
            return;
        }

        paintMaterial(targetCell, currentMaterial);
    }

    function handleRemove(targetCell) {
        if (!targetCell) {
            return;
        }

        clearCell(targetCell);
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

    function getPinchDistance(first, second) {
        return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    }

    applyMobileMode();
    mobileMediaQuery.addEventListener('change', applyMobileMode);
    mobileMediaQuery.addEventListener('change', syncExportButtonLocation);

    mobileToolButtons.forEach((button) => {
        button.addEventListener('click', () => setCurrentMobileAction(button.dataset.mode));
    });

    materialButtons.forEach((button) => {
        button.addEventListener('click', () => setCurrentMaterial(button.dataset.material));
    });

    measurementsBtn.addEventListener('click', () => {
        const measurementsVisible = document.body.classList.toggle('show-measurements');
        measurementsBtn.textContent = measurementsVisible ? 'Hide Measurements' : 'Show Measurements';
    });

    loadLastDesignBtn.addEventListener('click', () => {
        const loaded = loadGridFromCache();
        if (!loaded) {
            alert('No saved design found yet. Start drawing and it will save automatically.');
        }
    });

    applyCanvasBtn.addEventListener('click', updateCanvasSize);

    gridShell.addEventListener('wheel', (event) => {
        event.preventDefault();
        const direction = event.deltaY > 0 ? -1 : 1;
        setZoom(zoomLevel + (direction * ZOOM_STEP_WHEEL));
    }, { passive: false });

    lawn.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse' && event.button === 2) {
            pointerAction = 'erase';
        } else if (isMobileSafari) {
            pointerAction = currentMobileAction === 'place' ? 'paint' : 'erase';
        } else {
            pointerAction = 'paint';
        }

        lawn.setPointerCapture(event.pointerId);
        applyPointerAction(readCellFromPointerEvent(event));
    });

    lawn.addEventListener('pointermove', (event) => {
        if (!pointerAction) {
            return;
        }
        applyPointerAction(readCellFromPointerEvent(event));
    });

    lawn.addEventListener('pointerup', () => {
        if (pointerAction) {
            saveGridToCache();
        }
        pointerAction = null;
    });

    lawn.addEventListener('pointercancel', () => {
        pointerAction = null;
    });

    lawn.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    gridShell.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
            pinchState = {
                distance: getPinchDistance(event.touches[0], event.touches[1]),
                zoom: zoomLevel
            };
        }
    }, { passive: false });

    gridShell.addEventListener('touchmove', (event) => {
        if (event.touches.length !== 2 || !pinchState) {
            return;
        }

        event.preventDefault();
        const nextDistance = getPinchDistance(event.touches[0], event.touches[1]);
        if (!nextDistance || !pinchState.distance) {
            return;
        }

        const ratio = nextDistance / pinchState.distance;
        setZoom(pinchState.zoom * ratio);
    }, { passive: false });

    gridShell.addEventListener('touchend', () => {
        if (pinchState) {
            saveGridToCache();
        }
        pinchState = null;
    });

    clearBtn.addEventListener('click', () => {
        const cells = lawn.querySelectorAll('.cell');
        cells.forEach((cell) => clearCell(cell));
        saveGridToCache();
    });

    exportBtn.addEventListener('click', async () => {
        exportBtn.textContent = 'Generating...';
        exportBtn.disabled = true;

        const exportWrapper = document.createElement('div');
        exportWrapper.style.background = '#1e293b';
        exportWrapper.style.padding = '32px';
        exportWrapper.style.display = 'inline-flex';
        exportWrapper.style.justifyContent = 'center';
        exportWrapper.style.alignItems = 'center';

        const clone = gridShell.cloneNode(true);
        clone.style.maxWidth = 'none';
        clone.style.maxHeight = 'none';
        clone.style.overflow = 'visible';
        clone.scrollTop = 0;
        clone.scrollLeft = 0;
        exportWrapper.appendChild(clone);
        document.body.appendChild(exportWrapper);

        try {
            const canvas = await html2canvas(exportWrapper, {
                scale: 2,
                backgroundColor: '#1e293b'
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    exportBtn.textContent = 'Export Image';
                    exportBtn.disabled = false;
                    document.body.removeChild(exportWrapper);
                    alert('Sorry, there was an issue exporting the image.');
                    return;
                }

                const file = new File([blob], 'backyard-layout.png', { type: 'image/png' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'My Backyard Layout'
                        });
                    } catch (error) {
                        console.log('Share canceled by user');
                    }
                } else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'backyard-layout.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

                exportBtn.textContent = 'Export Image';
                exportBtn.disabled = false;
                document.body.removeChild(exportWrapper);
            }, 'image/png');
        } catch (error) {
            console.error('Error exporting image:', error);
            alert('Sorry, there was an issue exporting the image.');
            exportBtn.textContent = 'Export Image';
            exportBtn.disabled = false;
            document.body.removeChild(exportWrapper);
        }
    });

    applyGridSizing();
    buildGrid();
    buildRulers();
    setCurrentMobileAction(currentMobileAction);
    setCurrentMaterial(currentMaterial);
    setZoom(1);
    syncExportButtonLocation();
    loadGridFromCache();
});
