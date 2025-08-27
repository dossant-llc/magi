/**
 * AGIfor.me Mermaid Diagram Utilities
 * Enhanced Mermaid functionality with zoom, pan, and lazy loading
 */

class AGIMermaidUtils {
    constructor() {
        this.activeSection = null;
        this.renderedSections = new Set();
        this.panZoomInstances = new Map();
    }

    /**
     * Initialize Mermaid with AGI branding and enhanced features
     */
    async initializeMermaid() {
        if (typeof mermaid === 'undefined') {
            console.error('Mermaid library not loaded');
            return;
        }

        mermaid.initialize({
            startOnLoad: false, // We'll control rendering manually
            theme: 'default',
            themeVariables: {
                primaryColor: '#4caf50',
                primaryTextColor: '#ffffff', 
                primaryBorderColor: '#45a049',
                lineColor: '#333333',
                secondaryColor: '#e1f5fe',
                tertiaryColor: '#fff3e0',
                background: '#ffffff',
                mainBkg: '#ffffff',
                secondaryBkg: '#f8f9fa',
                tertiaryBkg: '#e3f2fd'
            },
            flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis'
            },
            sequence: {
                useMaxWidth: true,
                wrap: true,
                width: 150
            },
            gantt: {
                useMaxWidth: true
            }
        });
    }

    /**
     * Render diagrams for a specific section with lazy loading
     */
    async renderSection(sectionId) {
        if (this.renderedSections.has(sectionId)) {
            return; // Already rendered
        }

        const section = document.getElementById(sectionId);
        if (!section) return;

        const diagrams = section.querySelectorAll('.mermaid');
        
        for (let i = 0; i < diagrams.length; i++) {
            const diagram = diagrams[i];
            const diagramId = `${sectionId}-diagram-${i}`;
            
            try {
                // Show loading state
                diagram.innerHTML = '<div class="agi-diagram-loading">🧠 Rendering diagram...</div>';
                
                // Get the diagram source
                const diagramSource = diagram.getAttribute('data-diagram') || diagram.textContent;
                
                // Clear the diagram
                diagram.innerHTML = '';
                diagram.id = diagramId;
                
                // Render with Mermaid
                const { svg } = await mermaid.render(`mermaid-${diagramId}`, diagramSource);
                diagram.innerHTML = svg;
                
                // Add zoom and pan functionality
                this.addPanZoom(diagramId);
                
                // Add diagram controls
                this.addDiagramControls(diagram, diagramId);
                
            } catch (error) {
                console.error(`Error rendering diagram in ${sectionId}:`, error);
                diagram.innerHTML = `<div class="agi-diagram-error">❌ Error rendering diagram: ${error.message}</div>`;
            }
        }

        this.renderedSections.add(sectionId);
    }

    /**
     * Add pan and zoom functionality to a diagram
     */
    addPanZoom(diagramId) {
        const diagramElement = document.getElementById(diagramId);
        if (!diagramElement) return;

        const svg = diagramElement.querySelector('svg');
        if (!svg) return;

        // Make SVG responsive but zoomable
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.maxHeight = '70vh';
        svg.style.cursor = 'grab';

        // Add pan-zoom library if available, otherwise basic zoom
        if (typeof svgPanZoom !== 'undefined') {
            const panZoom = svgPanZoom(svg, {
                zoomEnabled: true,
                panEnabled: true,
                controlIconsEnabled: false,
                fit: true,
                center: true,
                minZoom: 0.1,
                maxZoom: 10,
                zoomScaleSensitivity: 0.2
            });
            
            this.panZoomInstances.set(diagramId, panZoom);
        } else {
            // Basic zoom with mouse wheel
            this.addBasicZoom(svg);
        }
    }

    /**
     * Add basic zoom functionality without external library
     */
    addBasicZoom(svg) {
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        const updateTransform = () => {
            svg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        svg.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale = Math.max(0.1, Math.min(3, scale * delta));
            updateTransform();
        });

        svg.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            svg.style.cursor = 'grabbing';
        });

        svg.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            
            translateX += deltaX;
            translateY += deltaY;
            
            lastX = e.clientX;
            lastY = e.clientY;
            
            updateTransform();
        });

        svg.addEventListener('mouseup', () => {
            isDragging = false;
            svg.style.cursor = 'grab';
        });

        svg.addEventListener('mouseleave', () => {
            isDragging = false;
            svg.style.cursor = 'grab';
        });

        // Double-click to reset
        svg.addEventListener('dblclick', () => {
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
        });
    }

    /**
     * Add diagram controls (zoom in, zoom out, reset, fullscreen)
     */
    addDiagramControls(diagramContainer, diagramId) {
        const controls = document.createElement('div');
        controls.className = 'agi-diagram-controls';
        controls.innerHTML = `
            <button class="agi-btn agi-btn-sm agi-btn-ghost" onclick="agiMermaid.zoomIn('${diagramId}')" title="Zoom In">
                🔍+
            </button>
            <button class="agi-btn agi-btn-sm agi-btn-ghost" onclick="agiMermaid.zoomOut('${diagramId}')" title="Zoom Out">
                🔍-
            </button>
            <button class="agi-btn agi-btn-sm agi-btn-ghost" onclick="agiMermaid.resetZoom('${diagramId}')" title="Reset View">
                🎯
            </button>
            <button class="agi-btn agi-btn-sm agi-btn-ghost" onclick="agiMermaid.toggleFullscreen('${diagramId}')" title="Fullscreen">
                ⛶
            </button>
        `;

        diagramContainer.style.position = 'relative';
        diagramContainer.appendChild(controls);
    }

    /**
     * Control functions for diagram interaction
     */
    zoomIn(diagramId) {
        const panZoom = this.panZoomInstances.get(diagramId);
        if (panZoom) {
            panZoom.zoomIn();
        }
    }

    zoomOut(diagramId) {
        const panZoom = this.panZoomInstances.get(diagramId);
        if (panZoom) {
            panZoom.zoomOut();
        }
    }

    resetZoom(diagramId) {
        const panZoom = this.panZoomInstances.get(diagramId);
        if (panZoom) {
            panZoom.resetZoom();
            panZoom.center();
            panZoom.fit();
        }
    }

    toggleFullscreen(diagramId) {
        const diagram = document.getElementById(diagramId);
        if (!diagram) return;

        // Always use modal fullscreen for consistent behavior and better control
        // Native fullscreen often has limitations with SVG scaling
        this.createModalFullscreen(diagram);
        
        // If you want to try native fullscreen first, uncomment below:
        /*
        // Try different fullscreen APIs for better browser support
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
            // Enter fullscreen - but add SVG scaling handler
            const enterFullscreen = () => {
                const svg = diagram.querySelector('svg');
                if (svg) {
                    svg.style.setProperty('width', '100vw', 'important');
                    svg.style.setProperty('height', '100vh', 'important');
                    svg.style.setProperty('max-width', 'none', 'important');
                    svg.style.setProperty('max-height', 'none', 'important');
                }
            };
            
            if (diagram.requestFullscreen) {
                diagram.requestFullscreen().then(enterFullscreen);
            } else if (diagram.webkitRequestFullscreen) {
                diagram.webkitRequestFullscreen();
                enterFullscreen();
            } else if (diagram.mozRequestFullScreen) {
                diagram.mozRequestFullScreen();
                enterFullscreen();
            } else if (diagram.msRequestFullscreen) {
                diagram.msRequestFullscreen();
                enterFullscreen();
            } else {
                // Fallback: create a modal-like fullscreen
                this.createModalFullscreen(diagram);
            }
        } else {
            // Exit fullscreen and restore SVG
            const svg = diagram.querySelector('svg');
            if (svg) {
                svg.style.removeProperty('width');
                svg.style.removeProperty('height');
                svg.style.removeProperty('max-width');
                svg.style.removeProperty('max-height');
            }
            
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
        */
    }

    createModalFullscreen(diagram) {
        // Create modal fullscreen as fallback
        const modal = document.createElement('div');
        modal.className = 'agi-diagram-modal';
        
        // Clone the diagram content
        const diagramClone = diagram.cloneNode(true);
        const svg = diagramClone.querySelector('svg');
        
        if (svg) {
            // Store original dimensions if they exist
            const originalWidth = svg.getAttribute('width') || svg.style.width || svg.getBoundingClientRect().width;
            const originalHeight = svg.getAttribute('height') || svg.style.height || svg.getBoundingClientRect().height;
            
            // Remove all dimension constraints
            svg.removeAttribute('width');
            svg.removeAttribute('height');
            svg.style.removeProperty('width');
            svg.style.removeProperty('height');
            svg.style.removeProperty('max-width');
            svg.style.removeProperty('max-height');
            svg.style.removeProperty('min-width');
            svg.style.removeProperty('min-height');
            
            // Force full size with important declarations
            svg.style.setProperty('width', '100%', 'important');
            svg.style.setProperty('height', '100%', 'important');
            svg.style.setProperty('max-width', 'none', 'important');
            svg.style.setProperty('max-height', 'none', 'important');
            
            // Set or update viewBox for proper scaling
            if (!svg.getAttribute('viewBox')) {
                const width = parseFloat(originalWidth) || 800;
                const height = parseFloat(originalHeight) || 600;
                svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
            }
            
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            
            // Ensure the SVG is scalable
            svg.style.setProperty('display', 'block', 'important');
        }
        
        modal.innerHTML = `
            <div class="agi-diagram-modal-backdrop" onclick="this.parentElement.remove()">
                <div class="agi-diagram-modal-content" onclick="event.stopPropagation()">
                    <button class="agi-diagram-modal-close" onclick="this.closest('.agi-diagram-modal').remove()">×</button>
                    <div class="agi-diagram-modal-svg-container">
                        ${diagramClone.innerHTML}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Apply pan-zoom to the fullscreen version
        const modalSvg = modal.querySelector('svg');
        if (modalSvg && typeof svgPanZoom !== 'undefined') {
            setTimeout(() => {
                const panZoom = svgPanZoom(modalSvg, {
                    zoomEnabled: true,
                    panEnabled: true,
                    controlIconsEnabled: false,
                    fit: true,
                    center: true,
                    minZoom: 0.1,
                    maxZoom: 10,
                    zoomScaleSensitivity: 0.2
                });
                
                // Store pan-zoom instance for cleanup
                modal._panZoom = panZoom;
            }, 100);
        }

        // Add escape key handler
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                if (modal._panZoom) {
                    modal._panZoom.destroy();
                }
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        // Cleanup on modal close
        const closeModal = () => {
            if (modal._panZoom) {
                modal._panZoom.destroy();
            }
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        };
        
        // Update close handlers
        modal.querySelector('.agi-diagram-modal-backdrop').onclick = closeModal;
        modal.querySelector('.agi-diagram-modal-close').onclick = closeModal;
    }

    /**
     * Show a specific section and render its diagrams
     */
    async showSection(sectionId) {
        // Hide all sections
        const sections = document.querySelectorAll('.diagram-section');
        sections.forEach(section => section.classList.remove('active'));
        
        // Remove active class from all buttons
        const buttons = document.querySelectorAll('.agi-nav-item');
        buttons.forEach(button => button.classList.remove('active'));
        
        // Show selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.activeSection = sectionId;
            
            // Render diagrams for this section
            await this.renderSection(sectionId);
        }
        
        // Add active class to clicked button
        const activeButton = document.querySelector(`[onclick*="${sectionId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}

// CSS for diagram controls and enhancements
const diagramCSS = `
<style>
.agi-diagram-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    font-size: 1.2em;
    color: var(--agi-grey-600);
    background: var(--agi-grey-50);
    border-radius: var(--agi-radius-lg);
    border: 2px dashed var(--agi-grey-300);
}

.agi-diagram-error {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    font-size: 1.1em;
    color: var(--agi-error);
    background: rgba(244, 67, 54, 0.1);
    border-radius: var(--agi-radius-lg);
    border: 2px dashed var(--agi-error);
}

.agi-diagram-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 4px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: var(--agi-radius-md);
    padding: 6px;
    box-shadow: var(--agi-shadow-md);
    backdrop-filter: blur(8px);
    z-index: 1000;
}

.agi-diagram-controls .agi-btn {
    min-width: 32px;
    height: 32px;
    padding: 4px;
    font-size: 14px;
}

.mermaid {
    position: relative;
    background: white;
    border: 1px solid var(--agi-grey-200);
    border-radius: var(--agi-radius-lg);
    padding: 20px;
    margin: 20px 0;
    overflow: hidden;
    min-height: 200px;
}

.mermaid svg {
    transition: transform 0.2s ease;
    max-width: 100%;
    height: auto;
}

.mermaid:fullscreen {
    background: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.mermaid:fullscreen svg {
    max-width: 95vw;
    max-height: 95vh;
}

/* Modal Fullscreen Fallback */
.agi-diagram-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.agi-diagram-modal-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    cursor: pointer;
}

.agi-diagram-modal-content {
    position: relative;
    background: white;
    border-radius: var(--agi-radius-xl);
    padding: 20px;
    margin: 20px;
    width: calc(100vw - 40px);
    height: calc(100vh - 40px);
    max-width: calc(100vw - 40px);
    max-height: calc(100vh - 40px);
    overflow: hidden;
    box-shadow: var(--agi-shadow-2xl);
    cursor: default;
    display: flex;
    flex-direction: column;
}

.agi-diagram-modal-svg-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 0;
}

.agi-diagram-modal-close {
    position: absolute;
    top: 15px;
    right: 20px;
    background: var(--agi-grey-100);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--agi-grey-600);
    transition: all 0.2s ease;
}

.agi-diagram-modal-close:hover {
    background: var(--agi-error);
    color: white;
    transform: scale(1.1);
}

.agi-diagram-modal svg {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
    min-width: 100% !important;
    min-height: 100% !important;
    display: block !important;
}

.agi-diagram-modal-svg-container svg {
    width: 100% !important;
    height: 100% !important;
    max-width: none !important;
    max-height: none !important;
}

/* Hidden sections for performance */
.diagram-section {
    display: none;
}

.diagram-section.active {
    display: block;
}

/* Responsive improvements */
@media (max-width: 768px) {
    .agi-diagram-controls {
        position: static;
        justify-content: center;
        margin-top: 10px;
        margin-bottom: 10px;
        background: rgba(255, 255, 255, 1);
    }
    
    .mermaid {
        padding: 15px;
        margin: 15px 0;
    }
    
    .agi-diagram-modal-content {
        margin: 10px;
        padding: 20px;
    }
    
    .agi-diagram-modal svg {
        max-width: 90vw;
        max-height: 80vh;
    }
}

/* Animation for smooth section transitions */
.diagram-section {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
}

.diagram-section.active {
    opacity: 1;
}
</style>
`;

// Auto-inject CSS
document.head.insertAdjacentHTML('beforeend', diagramCSS);

// Global instance
window.agiMermaid = new AGIMermaidUtils();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.agiMermaid.initializeMermaid();
    });
} else {
    window.agiMermaid.initializeMermaid();
}