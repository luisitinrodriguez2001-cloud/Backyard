document.addEventListener("DOMContentLoaded", () => {
    const lawn = document.getElementById('lawn');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const loadSketchBtn = document.getElementById('load-sketch-btn');
    const measurementToggleBtn = document.getElementById('toggle-measurements-btn');
    const materialGrid = document.getElementById('material-grid');
    const measurementOverlay = document.getElementById('measurement-overlay');

    const GRID_COLUMNS = 18;
    const GRID_ROWS = 22;
    const MATERIALS = [
        { key: 'empty', label: 'Erase' },
        { key: 'deck', label: 'Deck Tile' },
        { key: 'concrete', label: 'Concrete' },
        { key: 'landscaping', label: 'Bed' },
        { key: 'sand', label: 'Sand' },
        { key: 'seat', label: 'Seat' },
        { key: 'door', label: 'Door (3ft)' }
    ];

    let activeMaterial = 'deck';
    let showMeasurements = true;

    const cellByPosition = new Map();

    function cellKey(row, col) {
        return `${row}:${col}`;
    }

    function createMaterialButtons() {
        const fragment = document.createDocumentFragment();

        MATERIALS.forEach((material) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'material-btn';
            button.dataset.material = material.key;
            button.innerHTML = `<span class="swatch swatch-${material.key}" aria-hidden="true"></span>${material.label}`;
            if (material.key === activeMaterial) {
                button.classList.add('is-active');
            }

            button.addEventListener('click', () => {
                activeMaterial = material.key;
                [...materialGrid.querySelectorAll('.material-btn')].forEach((btn) => {
                    btn.classList.toggle('is-active', btn.dataset.material === activeMaterial);
                });
            });

            fragment.appendChild(button);
        });

        materialGrid.appendChild(fragment);
    }

    function applyMaterialToCell(cell, material) {
        cell.dataset.material = material;
    }

    function clearDoors() {
        lawn.querySelectorAll('.cell.has-door').forEach((cell) => {
            cell.classList.remove('has-door');
        });
    }

    function placeDoor(startRow, startCol) {
        clearDoors();
        const safeColStart = Math.min(Math.max(startCol, 0), GRID_COLUMNS - 3);

        for (let i = 0; i < 3; i++) {
            const doorCell = cellByPosition.get(cellKey(startRow, safeColStart + i));
            if (doorCell) {
                doorCell.classList.add('has-door');
            }
        }
    }

    function createCell(row, col) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.dataset.material = 'empty';
        cellByPosition.set(cellKey(row, col), cell);

        return cell;
    }

    function buildGrid() {
        lawn.style.setProperty('--grid-columns', GRID_COLUMNS);
        lawn.style.setProperty('--grid-rows', GRID_ROWS);

        const fragment = document.createDocumentFragment();
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLUMNS; col++) {
                fragment.appendChild(createCell(row, col));
            }
        }
        lawn.appendChild(fragment);
    }

    function buildMeasurementOverlay() {
        measurementOverlay.innerHTML = `
            <div class="measurement-label measurement-top">18 ft</div>
            <div class="measurement-label measurement-left">18 ft</div>
            <div class="measurement-label measurement-bottom">18 ft</div>
            <div class="measurement-label measurement-extension">4 ft extension</div>
        `;
    }

    function applySketchLayout() {
        clearGrid();

        const topBoundaryRow = 1;
        const bottomBoundaryRow = 18;
        const leftBoundaryCol = 0;
        const rightBoundaryCol = 17;

        for (let row = topBoundaryRow; row <= bottomBoundaryRow; row++) {
            for (let col = leftBoundaryCol; col <= rightBoundaryCol; col++) {
                applyMaterialToCell(cellByPosition.get(cellKey(row, col)), 'concrete');
            }
        }

        for (let row = 18; row <= 21; row++) {
            for (let col = 3; col <= 14; col++) {
                applyMaterialToCell(cellByPosition.get(cellKey(row, col)), 'sand');
            }
        }

        for (let col = 0; col <= 8; col++) {
            applyMaterialToCell(cellByPosition.get(cellKey(2, col)), 'landscaping');
        }

        const seatPath = [
            [16, 10], [15, 10], [15, 11], [15, 12], [15, 13],
            [14, 13], [13, 13], [12, 13], [11, 13], [11, 14], [11, 15], [11, 16], [11, 17]
        ];
        seatPath.forEach(([row, col]) => {
            applyMaterialToCell(cellByPosition.get(cellKey(row, col)), 'seat');
        });

        placeDoor(topBoundaryRow, 12);
    }

    function clearGrid() {
        lawn.querySelectorAll('.cell').forEach((cell) => {
            applyMaterialToCell(cell, 'empty');
            cell.classList.remove('has-door');
        });
    }

    function toggleMeasurements() {
        showMeasurements = !showMeasurements;
        lawn.classList.toggle('show-measurements', showMeasurements);
        measurementOverlay.classList.toggle('hidden', !showMeasurements);
        measurementToggleBtn.textContent = showMeasurements ? 'Hide Measurements' : 'Show Measurements';
    }

    lawn.addEventListener('click', (event) => {
        const cell = event.target.closest('.cell');
        if (!cell) {
            return;
        }

        const row = Number(cell.dataset.row);
        const col = Number(cell.dataset.col);

        if (activeMaterial === 'door') {
            if (row !== 1) {
                return;
            }
            placeDoor(row, col);
            return;
        }

        applyMaterialToCell(cell, activeMaterial);
    });

    clearBtn.addEventListener('click', clearGrid);
    loadSketchBtn.addEventListener('click', applySketchLayout);
    measurementToggleBtn.addEventListener('click', toggleMeasurements);

    exportBtn.addEventListener('click', async () => {
        exportBtn.textContent = 'Generating...';
        exportBtn.disabled = true;

        try {
            const canvas = await html2canvas(document.querySelector('.workspace'), {
                scale: 2,
                backgroundColor: '#0f172a'
            });

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'backyard-plan.png';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

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

    createMaterialButtons();
    buildGrid();
    buildMeasurementOverlay();
    lawn.classList.add('show-measurements');
    applySketchLayout();
});
