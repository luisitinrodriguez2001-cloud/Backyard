document.addEventListener("DOMContentLoaded", () => {
    const lawn = document.getElementById('lawn');
    const clearBtn = document.getElementById('clear-btn');
    const exportBtn = document.getElementById('export-btn');
    const GRID_SIZE = 10;
    const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

    // Build the initial grid
    function buildGrid() {
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            fragment.appendChild(cell);
        }
        
        lawn.appendChild(fragment);
    }

    // Handle Placement and Rotation (Left Clicks)
    lawn.addEventListener('click', (e) => {
        const target = e.target;

        // Place a tile
        if (target.classList.contains('cell') && target.children.length === 0) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.rotation = 0;
            target.appendChild(tile);
        }
        
        // Rotate a tile
        else if (target.classList.contains('tile')) {
            let currentRotation = parseInt(target.dataset.rotation || 0, 10);
            let newRotation = currentRotation + 90;
            
            target.dataset.rotation = newRotation;
            target.style.rotate = `${newRotation}deg`; // Using standard 'rotate' CSS property
        }
    });

    // Handle Removal (Right Clicks)
    lawn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const target = e.target;

        // Clicked directly on the tile
        if (target.classList.contains('tile')) {
            target.remove();
        } 
        // Clicked on the cell holding the tile
        else if (target.classList.contains('cell') && target.children.length > 0) {
            target.innerHTML = '';
        }
    });

    // Handle Clear Button
    clearBtn.addEventListener('click', () => {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => tile.remove());
    });

    // Handle Export Button (Mobile-friendly)
    exportBtn.addEventListener('click', async () => {
        exportBtn.textContent = 'Generating...';
        exportBtn.disabled = true;

        try {
            // Render the grid area to a canvas
            const canvas = await html2canvas(lawn, {
                scale: 2, // High resolution for retina displays
                backgroundColor: '#1e293b' // Match body background
            });

            // Convert canvas to image file
            canvas.toBlob(async (blob) => {
                const file = new File([blob], 'deck-pattern.png', { type: 'image/png' });

                // Try native mobile sharing first (iOS/Android)
                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            files: [file],
                            title: 'My Deck Pattern',
                        });
                    } catch (error) {
                        console.log('Share canceled by user');
                    }
                } 
                // Fallback for Desktop (Direct Download)
                else {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'deck-pattern.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

                // Reset UI
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

    // Initialize application
    buildGrid();
});
