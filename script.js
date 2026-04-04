document.addEventListener("DOMContentLoaded", () => {
    const lawn = document.getElementById('lawn');
    const GRID_SIZE = 10;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

    // State Tracking
    let currentMode = 'desktop_auto'; // Modes: 'desktop_auto', 'place', 'rotate', 'remove'

    // 1. Build the Grid
    function buildGrid() {
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            fragment.appendChild(cell);
        }
        lawn.appendChild(fragment);
    }

    // 2. Mobile / Desktop Detection Logic
    const mediaQuery = window.matchMedia("(max-width: 800px)");

    function handleDeviceChange(e) {
        if (e.matches) {
            // Screen is small (Mobile/Tablet): Force to explicitly use 'place' mode first
            setMobileMode('place');
        } else {
            // Screen is large (Desktop): Use standard left/right click logic
            currentMode = 'desktop_auto';
        }
    }
    mediaQuery.addEventListener('change', handleDeviceChange);
    handleDeviceChange(mediaQuery); // Run on load

    // 3. Mobile Mode Buttons Logic
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

    // 4. Click Handler (Drives both Desktop and Mobile logic)
    lawn.addEventListener('click', (e) => {
        const target = e.target;
        const isCell = target.classList.contains('cell');
        const isTile = target.classList.contains('tile');

        // DESKTOP LOGIC
        if (currentMode === 'desktop_auto') {
            if (isCell && target.children.length === 0) placeTile(target);
            else if (isTile) rotateTile(target);
        } 
        
        // MOBILE LOGIC
        else {
            if (currentMode === 'place' && isCell && target.children.length === 0) placeTile(target);
            else if (currentMode === 'rotate' && isTile) rotateTile(target);
            else if (currentMode === 'remove' && isTile) target.remove();
        }
    });

    // Handle Right Click (Desktop Only)
    lawn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Only allow right-click removal if we are in desktop mode
        if (currentMode !== 'desktop_auto') return;

        const target = e.target;
        if (target.classList.contains('tile')) target.remove();
        else if (target.classList.contains('cell') && target.children.length > 0) target.innerHTML = '';
    });

    // Helper Functions
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

    // 5. Global Action Buttons (Handles both Desktop & Mobile versions of the buttons)
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tile').forEach(t => t.remove());
        });
    });

    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const originalText = btn.textContent;
            btn.textContent = 'Generating...';
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
