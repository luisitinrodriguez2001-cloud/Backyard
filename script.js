document.addEventListener("DOMContentLoaded", () => {
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
    const ZOOM_STEP = 0.1;

    const lawn = document.getElementById('lawn');
    const gridShell = document.getElementById('grid-shell');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const desktopControls = document.getElementById('desktop-controls');
    const mobileExportSlot = document.getElementById('mobile-export-slot');
    const mobileToolButtons = document.querySelectorAll('.mobile-tool-btn');
    const materialButtons = document.querySelectorAll('.palette-btn');
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    const measurementsBtn = document.getElementById('measurements-btn');
    const loadSketchBtn = document.getElementById('load-sketch-btn');
    const topRuler = document.getElementById('top-ruler');
    const leftRuler = document.getElementById('left-ruler');
    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const applyCanvasBtn = document.getElementById('apply-canvas-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');

    let currentMobileAction = 'place';
    let currentMaterial = 'deck';
    let isMobileSafari = false;
    let isBackyardMode = false;
    let gridCols = Number(canvasWidthInput.value);
    let gridRows = Number(canvasHeightInput.value);
    let zoomLevel = 1;

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

    function getCell(row, col) {
        if (row < 1 || col < 1 || row > gridRows || col > gridCols) {
            return null;
        }
        return lawn.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
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

    function setDesignMode(nextMode) {
        isBackyardMode = nextMode === 'backyard';
        document.body.classList.toggle('backyard-mode', isBackyardMode);

        modeToggleBtn.textContent = isBackyardMode
            ? 'Switch to Deck Tile Only'
            : 'Switch to Backyard Materials';

        if (!isBackyardMode) {
            setCurrentMaterial('deck');
        }
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
    }

    function applyZoom() {
        const baseCellSize = document.body.classList.contains('mobile-mode')
            ? BASE_CELL_SIZE_MOBILE
            : BASE_CELL_SIZE_DESKTOP;
        const effectiveCellSize = Math.round(baseCellSize * zoomLevel);
        document.documentElement.style.setProperty('--cell-size', `${effectiveCellSize}px`);
        zoomResetBtn.textContent = `${Math.round(zoomLevel * 100)}%`;
    }

    function setZoom(nextZoom) {
        zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
        applyZoom();
    }

    function loadSketchLayout() {
        const cells = lawn.querySelectorAll('.cell');
        cells.forEach((cell) => clearCell(cell));

        for (let row = 1; row <= 18; row++) {
            for (let col = 1; col <= 18; col++) {
                const borderCell = getCell(row, col);
                if (!borderCell) {
                    continue;
                }
                if (row === 1 || row === 18 || col === 1 || col === 18) {
                    borderCell.appendChild(createFeature('concrete'));
                }
            }
        }

        for (let col = 2; col <= 17; col++) {
            paintMaterial(getCell(19, col), 'sand');
            paintMaterial(getCell(20, col), 'sand');
            if (col >= 3 && col <= 16) {
                paintMaterial(getCell(21, col), 'sand');
            }
            if (col >= 5 && col <= 14) {
                paintMaterial(getCell(22, col), 'sand');
            }
        }

        for (let col = 2; col <= 9; col++) {
            paintMaterial(getCell(2, col), 'seat');
        }

        paintMaterial(getCell(1, 13), 'door');

        const stepPath = [
            [15, 10], [14, 10], [14, 11], [14, 12], [14, 13], [14, 14],
            [13, 14], [12, 14], [11, 14], [10, 14], [9, 14], [9, 15], [9, 16], [9, 17]
        ];

        stepPath.forEach(([row, col]) => {
            const cell = getCell(row, col);
            if (cell) {
                paintMaterial(cell, 'landscaping');
            }
        });
    }

    function handlePaint(targetCell) {
        if (!targetCell) {
            return;
        }

        if (!isBackyardMode) {
            paintMaterial(targetCell, 'deck');
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

    applyMobileMode();
    mobileMediaQuery.addEventListener('change', applyMobileMode);
    mobileMediaQuery.addEventListener('change', syncExportButtonLocation);

    mobileToolButtons.forEach((button) => {
        button.addEventListener('click', () => setCurrentMobileAction(button.dataset.mode));
    });

    materialButtons.forEach((button) => {
        button.addEventListener('click', () => setCurrentMaterial(button.dataset.material));
    });

    modeToggleBtn.addEventListener('click', () => {
        setDesignMode(isBackyardMode ? 'deck' : 'backyard');
    });

    measurementsBtn.addEventListener('click', () => {
        const measurementsVisible = document.body.classList.toggle('show-measurements');
        measurementsBtn.textContent = measurementsVisible ? 'Hide Measurements' : 'Show Measurements';
    });

    loadSketchBtn.addEventListener('click', () => {
        if (!isBackyardMode) {
            setDesignMode('backyard');
        }
        loadSketchLayout();
    });

    applyCanvasBtn.addEventListener('click', updateCanvasSize);

    zoomInBtn.addEventListener('click', () => setZoom(zoomLevel + ZOOM_STEP));
    zoomOutBtn.addEventListener('click', () => setZoom(zoomLevel - ZOOM_STEP));
    zoomResetBtn.addEventListener('click', () => setZoom(1));

    lawn.addEventListener('click', (e) => {
        const cell = e.target.closest('.cell');

        if (isMobileSafari) {
            if (currentMobileAction === 'place') {
                handlePaint(cell);
            } else {
                handleRemove(cell);
            }
            return;
        }

        handlePaint(cell);
    });

    lawn.addEventListener('contextmenu', (e) => {
        if (isMobileSafari) {
            return;
        }

        e.preventDefault();
        const cell = e.target.closest('.cell');
        handleRemove(cell);
    });

    clearBtn.addEventListener('click', () => {
        const cells = lawn.querySelectorAll('.cell');
        cells.forEach((cell) => clearCell(cell));
    });

    exportBtn.addEventListener('click', async () => {
        exportBtn.textContent = 'Generating...';
        exportBtn.disabled = true;

        try {
            const canvas = await html2canvas(document.getElementById('grid-shell'), {
                scale: 2,
                backgroundColor: '#1e293b'
            });

            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'backyard-layout.png', { type: 'image/png' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'My Backyard Layout',
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
            }, 'image/png');

        } catch (error) {
            console.error('Error exporting image:', error);
            alert('Sorry, there was an issue exporting the image.');
            exportBtn.textContent = 'Export Image';
            exportBtn.disabled = false;
        }
    });

    applyGridSizing();
    buildGrid();
    buildRulers();
    setCurrentMobileAction(currentMobileAction);
    setCurrentMaterial(currentMaterial);
    setDesignMode('deck');
    setZoom(1);
    syncExportButtonLocation();
});
