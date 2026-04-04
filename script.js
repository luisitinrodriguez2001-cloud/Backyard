document.addEventListener("DOMContentLoaded", () => {
    const lawn = document.getElementById('lawn');
    const GRID_SIZE = 10;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

    let currentMode = 'desktop_auto';

    function buildGrid() {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            fragment.appendChild(cell);
        }
        lawn.appendChild(fragment);
    }

    // Handle detecting Desktop vs Mobile automatically
    const mediaQuery = window.matchMedia("(max-width: 800px)");
    function handleDeviceChange(e) {
        if (e.matches) setMobileMode('place');
        else currentMode = 'desktop_auto';
    }
    mediaQuery.addEventListener('change', handleDeviceChange);
    handleDeviceChange(mediaQuery);

    // Mobile mode button highlight logic
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            setMobileMode(e.target.dataset.mode);
        });
    });

    function setMobileMode(mode) {
        currentMode = mode;
        modeBtns.forEach(b => {
            if (b.dataset.mode === mode) b.classList.add('active');
            else b.classList.remove('active');
        });
    }

    // Master Click Handler
    lawn.addEventListener('click', (e) => {
        // .closest() ensures we accurately detect the tap even if it hits an edge
        const cell = e.target.closest('.cell');
        const tile = e.target.closest('.tile');

        // DESKTOP LOGIC
        if (currentMode === 'desktop_auto') {
            if (tile) rotateTile(tile);
            else if (cell && cell.children.length === 0) placeTile(cell);
        } 
        // MOBILE LOGIC
        else {
            if (currentMode === 'place' && cell && !tile) placeTile(cell);
            else if (currentMode === 'rotate' && tile) rotateTile(tile);
            else if (currentMode === 'remove' && tile) tile.remove();
        }
    });

    // Handle Desktop Right-Click
    lawn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (currentMode !== 'desktop_auto') return; // Ignore on mobile

        const target = e.target;
        if (target.classList.contains('tile')) target.remove();
        else if (target.classList.contains('cell') && target.children.length > 0) target.innerHTML = '';
    });

    function placeTile(cellElement) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.rotation = 0;
        cellElement.appendChild(tile);
    }

    function rotateTile(tileElement) {
        let rotation = parseInt(tileElement.dataset.rotation || 0, 10) + 90;
        tileElement.dataset.rotation = rotation;
        tileElement.style.rotate = `${rotation}deg`;
    }

    // Clear and Export Buttons (Wired up for both Mobile and Desktop UI)
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tile').forEach(t => t.remove());
        });
    });

    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const originalText = btn.textContent;
            btn.textContent = '...';
            btn.disabled = true;

            try {
                const canvas = await html2canvas(lawn, { scale: 2, backgroundColor: '#1e293b' });
                canvas.toBlob(async (blob) => {
                    const file = new File([blob], 'deck-pattern.png', { type: 'image/png' });

                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        try { await navigator.share({ files: [file], title: 'My Deck Pattern' }); } 
                        catch (error) { console.log('Share canceled'); }
                    } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'deck-pattern.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 'image/png');
            } catch (error) {
                console.error(error);
                alert('Issue exporting the image.');
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    });

    buildGrid();
});
