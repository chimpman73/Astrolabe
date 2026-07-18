import React, { useState, useEffect, useRef } from 'react';
import { useSystemStore } from '../store/useSystemStore';
import { shapeManager } from '../utils/ShapeManager';
import { 
  X, ChevronLeft, ChevronRight, Sparkles, Upload, Trash2, 
  Wand2, RefreshCw, Sliders, Check 
} from 'lucide-react';

interface CustomShapeWizardModalProps {
  onClose: () => void;
  initialMode?: 'create' | 'edit';
}

type Step = 'source-selection' | 'configure-generate' | 'preview-save' | 'edit-list';

export const CustomShapeWizardModal: React.FC<CustomShapeWizardModalProps> = ({ 
  onClose, 
  initialMode = 'create' 
}) => {
  const { setToastMessage } = useSystemStore();
  const [step, setStep] = useState<Step>(initialMode === 'edit' ? 'edit-list' : 'source-selection');
  
  // Wizard creation states
  const [sourceType, setSourceType] = useState<'upload' | 'prompt'>('upload');
  const [shapeName, setShapeName] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [sourceFilename, setSourceFilename] = useState<string | null>(null);
  
  // AI Prompt states
  const [prompt, setPrompt] = useState('a celestial dragon silhouette, solid black on transparent background');
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [saveApiKey, setSaveApiKey] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Trace parameters
  const [turdsize, setTurdsize] = useState(2);
  const [alphamax, setAlphamax] = useState(1.0);
  const [isTracing, setIsTracing] = useState(false);
  const [showAdvancedTrace, setShowAdvancedTrace] = useState(false);

  // Resulting shape data
  const [tracedSvgContent, setTracedSvgContent] = useState<string | null>(null);
  const [tracedSkeletonData, setTracedSkeletonData] = useState<any>(null);
  const [selectedLOD, setSelectedLOD] = useState(10); // Detail level 1-20 (default 10 = 50 nodes)

  // Edit list states
  const [availableShapes, setAvailableShapes] = useState<string[]>([]);
  const [selectedShapeToEdit, setSelectedShapeToEdit] = useState<string | null>(null);

  // Canvas refs
  const outlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const constellationCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Load API Key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(`astrolabe_api_key_${provider}`);
    if (savedKey) {
      setApiKey(savedKey);
    } else {
      setApiKey('');
    }
  }, [provider]);

  // Load available shapes on mount
  useEffect(() => {
    setAvailableShapes(shapeManager.getAvailableShapes());
  }, []);

  // Sync shapeName when a local file is picked
  const handleSelectImageFile = async () => {
    if (!window.astrolabeAPI?.selectImageFile) return;
    try {
      const res = await window.astrolabeAPI.selectImageFile();
      if (res.success && res.data) {
        setImageBase64(res.data.base64Data);
        setSourceFilename(res.data.filename);
        
        // Sanitize name
        const baseName = res.data.filename.split('.')[0] || 'shape';
        const sanitized = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        setShapeName(sanitized);
        
        setStep('configure-generate');
      } else if (!res.success && res.error && res.code !== 'ERR_USER_CANCELED') {
        setToastMessage({ type: 'error', text: `Failed to select image: ${res.error}` });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `File select error: ${err.message || err}` });
    }
  };

  // Generate Image from Prompt
  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setToastMessage({ type: 'error', text: 'Prompt is required.' });
      return;
    }
    if (!apiKey.trim()) {
      setToastMessage({ type: 'error', text: 'API Key is required to call image generator.' });
      return;
    }

    setIsGeneratingImage(true);
    try {
      if (saveApiKey) {
        localStorage.setItem(`astrolabe_api_key_${provider}`, apiKey);
      } else {
        localStorage.removeItem(`astrolabe_api_key_${provider}`);
      }

      if (!window.astrolabeAPI?.generateImageFromPrompt) {
        throw new Error('API not available.');
      }

      const res = await window.astrolabeAPI.generateImageFromPrompt({
        prompt: `${prompt}, solid black silhouette vector style, plain white background`,
        provider,
        apiKey
      });

      if (res.success && res.data) {
        setImageBase64(res.data);
        setSourceFilename(`ai_generated_${provider}.png`);
        
        // Derive name from prompt words
        const derivedName = prompt
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .slice(0, 3)
          .join('_') || 'ai_shape';
        setShapeName(derivedName);
        
        setToastMessage({ type: 'success', text: 'Silhouette generated successfully!' });
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Failed to generate image.' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Generation error: ${err.message || err}` });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Run potrace trace & skeletonizer algorithms
  const handleTraceImage = async () => {
    if (!imageBase64) {
      setToastMessage({ type: 'error', text: 'No source image loaded.' });
      return;
    }
    if (!shapeName.trim()) {
      setToastMessage({ type: 'error', text: 'Shape name is required.' });
      return;
    }

    setIsTracing(true);
    try {
      if (!window.astrolabeAPI?.traceAndSkeletonize) {
        throw new Error('Backend trace API is not configured.');
      }

      const res = await window.astrolabeAPI.traceAndSkeletonize({
        imageBase64,
        traceParams: {
          turdsize,
          alphamax
        }
      });

      if (res.success && res.data) {
        setTracedSvgContent(res.data.svgContent);
        setTracedSkeletonData(res.data.skeletonData);
        setStep('preview-save');
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Tracing failed.' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Tracing error: ${err.message || err}` });
    } finally {
      setIsTracing(false);
    }
  };

  // Save shape to writeable custom folder
  const handleSaveShape = async () => {
    if (!shapeName.trim() || !tracedSvgContent || !tracedSkeletonData) return;

    try {
      if (!window.astrolabeAPI?.saveCustomShape) {
        throw new Error('Save Custom Shape API is not configured.');
      }

      const cleanName = shapeName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const res = await window.astrolabeAPI.saveCustomShape({
        shapeName: cleanName,
        svgContent: tracedSvgContent,
        skeletonData: tracedSkeletonData
      });

      if (res.success) {
        setToastMessage({ type: 'success', text: `Custom shape "${cleanName}" saved successfully!` });
        await shapeManager.reload();
        onClose();
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Failed to save shape.' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Save error: ${err.message || err}` });
    }
  };

  // Edit / Load existing shape
  const handleEditShapeSelect = async (name: string) => {
    try {
      if (!window.astrolabeAPI?.loadShape || !window.astrolabeAPI?.loadShapeSkeleton) {
        throw new Error('Load shape APIs not available.');
      }

      setSelectedShapeToEdit(name);
      setShapeName(name);

      const shapeRes = await window.astrolabeAPI.loadShape(name);
      const skelRes = await window.astrolabeAPI.loadShapeSkeleton(name);

      if (shapeRes.success && shapeRes.data && skelRes.success && skelRes.data) {
        setTracedSvgContent(shapeRes.data);
        setTracedSkeletonData(skelRes.data);
        setStep('preview-save');
      } else {
        setToastMessage({ 
          type: 'error', 
          text: `Failed to load shape/skeleton data. Custom skeletons may not exist for built-in shapes.` 
        });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Load error: ${err.message || err}` });
    }
  };

  // Delete custom shape
  const handleDeleteShape = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete the custom shape "${name}"?`)) return;

    try {
      if (!window.astrolabeAPI?.deleteCustomShape) {
        throw new Error('Delete Shape API not configured.');
      }

      const res = await window.astrolabeAPI.deleteCustomShape(name);
      if (res.success) {
        setToastMessage({ type: 'success', text: `Custom shape "${name}" deleted.` });
        await shapeManager.reload();
        setAvailableShapes(shapeManager.getAvailableShapes());
        if (selectedShapeToEdit === name) {
          setSelectedShapeToEdit(null);
        }
      } else {
        setToastMessage({ type: 'error', text: res.error || 'Failed to delete shape.' });
      }
    } catch (err: any) {
      setToastMessage({ type: 'error', text: `Delete error: ${err.message || err}` });
    }
  };

  // Extract path data from SVG string
  const getPathData = (svgStr: string | null): string | null => {
    if (!svgStr) return null;
    const match = svgStr.match(/<path[^>]*d="([^"]+)"/i);
    return (match && match[1]) ? match[1] : null;
  };

  // Render previews on step 3
  useEffect(() => {
    if (step !== 'preview-save' || !tracedSvgContent) return;

    const pathData = getPathData(tracedSvgContent);
    if (!pathData) return;

    const path2d = new Path2D(pathData);

    // 1. Render Outline Canvas
    const outlineCanvas = outlineCanvasRef.current;
    if (outlineCanvas) {
      const ctx = outlineCanvas.getContext('2d');
      if (ctx) {
        const w = outlineCanvas.width;
        const h = outlineCanvas.height;
        ctx.clearRect(0, 0, w, h);
        
        // Parchment / Space background
        ctx.fillStyle = '#0f172a'; // space color
        ctx.fillRect(0, 0, w, h);

        // Draw path standard scale
        ctx.save();
        ctx.translate(20, 20); // 20px padding
        ctx.scale(1.6, 1.6);  // 100x100 -> 160x160
        ctx.fillStyle = 'rgba(224, 202, 166, 0.95)'; // parchment body color
        ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.fill(path2d);
        ctx.restore();
      }
    }

    // 2. Render Constellation Canvas
    const constellationCanvas = constellationCanvasRef.current;
    if (constellationCanvas && tracedSkeletonData) {
      const ctx = constellationCanvas.getContext('2d');
      const lodData = tracedSkeletonData[selectedLOD];
      if (ctx && lodData) {
        const w = constellationCanvas.width;
        const h = constellationCanvas.height;
        ctx.clearRect(0, 0, w, h);
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Draw connections
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        for (const edge of lodData.edges || []) {
          ctx.beginPath();
          ctx.moveTo(edge.p1.x * 1.6 + 20, edge.p1.y * 1.6 + 20);
          ctx.lineTo(edge.p2.x * 1.6 + 20, edge.p2.y * 1.6 + 20);
          ctx.stroke();
        }

        // Draw star nodes
        ctx.setLineDash([]);
        for (const pt of lodData.points || []) {
          const cx = pt.x * 1.6 + 20;
          const cy = pt.y * 1.6 + 20;

          // Radial glow
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(0.3, 'rgba(125, 211, 252, 0.6)'); // cyan tint
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
          ctx.fill();

          // Star core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx, cy, 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }
  }, [step, tracedSvgContent, tracedSkeletonData, selectedLOD]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--color-bg-panel)] border-2 border-double border-[var(--color-border-parchment)] w-full max-w-2xl rounded-lg shadow-2xl flex flex-col max-h-[90vh] text-[var(--color-text-main)] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-parchment)] px-6 py-4 bg-black/20">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[var(--color-accent-gold)] animate-pulse" />
            <h3 className="font-title text-base tracking-widest font-black uppercase">
              {step === 'edit-list' ? 'Custom Shape Library' : 'Custom Shape Wizard'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-red)] transition-colors p-1 rounded-full hover:bg-[var(--color-border-parchment)]"
            title="Close Custom Shape Wizard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* STEP 1: Source Selection */}
          {step === 'source-selection' && (
            <div className="space-y-6 text-center">
              <h4 className="font-title text-sm tracking-wider uppercase text-[var(--color-accent-gold)]">
                Choose Silhouette Source
              </h4>
              <p className="text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed">
                To create a custom celestial world or constellation, you need a high-contrast black-and-white silhouette image. You can either import a local file or ask an AI to generate one.
              </p>

              <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
                
                {/* Upload option */}
                <button
                  onClick={() => {
                    setSourceType('upload');
                    handleSelectImageFile();
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--color-border-parchment)] rounded-lg hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-bg-base)] transition-all gap-3 cursor-pointer group"
                >
                  <Upload className="w-10 h-10 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] transition-colors" />
                  <span className="font-title tracking-wider font-bold">Local Image</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Upload PNG/JPG file</span>
                </button>

                {/* AI prompt option */}
                <button
                  onClick={() => {
                    setSourceType('prompt');
                    setStep('configure-generate');
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[var(--color-border-parchment)] rounded-lg hover:border-[var(--color-accent-gold)] hover:bg-[var(--color-bg-base)] transition-all gap-3 cursor-pointer group"
                >
                  <Sparkles className="w-10 h-10 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent-gold)] transition-colors" />
                  <span className="font-title tracking-wider font-bold">AI Image Prompt</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Generate silhouette with AI</span>
                </button>
              </div>

              <div className="pt-6 border-t border-[var(--color-border-parchment)]">
                <button
                  onClick={() => setStep('edit-list')}
                  className="px-4 py-2 border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-base)] transition-colors rounded uppercase font-bold text-[10px] tracking-wider"
                >
                  Manage Shape Library / Edit Existing
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure & Generate */}
          {step === 'configure-generate' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-title text-sm tracking-wider uppercase text-[var(--color-accent-gold)]">
                  {sourceType === 'prompt' ? 'AI Silhouette Generation' : 'Trace Source Configuration'}
                </h4>
                <button 
                  onClick={() => setStep('source-selection')}
                  className="text-[var(--color-text-muted)] hover:underline flex items-center gap-1 font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to source selection
                </button>
              </div>

              {/* Source Option A: AI Prompt Generation */}
              {sourceType === 'prompt' && (
                <div className="space-y-4 bg-black/10 p-4 border border-[var(--color-border-parchment)] rounded">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="font-semibold text-[var(--color-accent-gold)]">AI Text Prompt</label>
                      <textarea
                        rows={2}
                        className="editor-textarea w-full"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. solid black silhouette of a griffin, flying pose, white background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-accent-gold)]">AI Model Provider</label>
                      <select 
                        className="editor-select w-full"
                        value={provider}
                        onChange={e => setProvider(e.target.value as any)}
                      >
                        <option value="gemini">Google Gemini (Imagen 3)</option>
                        <option value="openai">OpenAI (DALL-E 3)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-accent-gold)] flex justify-between">
                        <span>API Key ({provider === 'gemini' ? 'Studio Key' : 'Secret Key'})</span>
                      </label>
                      <input
                        type="password"
                        className="editor-input w-full"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder={`Paste your ${provider} api key`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-[var(--color-text-muted)]">
                      <input 
                        type="checkbox" 
                        checked={saveApiKey}
                        onChange={e => setSaveApiKey(e.target.checked)}
                      />
                      Save API key in LocalStorage
                    </label>

                    <button
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage}
                      className="px-4 py-2 bg-[var(--color-accent-gold)] text-[#2b2316] font-bold rounded flex items-center gap-2 hover:bg-[var(--color-accent-gold)]/80 disabled:opacity-50 transition-all font-title uppercase tracking-wider text-[10px]"
                    >
                      {isGeneratingImage ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Generate Silhouette
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Source image preview */}
              {imageBase64 ? (
                <div className="flex gap-4 p-4 border border-[var(--color-border-parchment)] rounded bg-black/10">
                  <div className="w-28 h-28 bg-white border border-gray-400 rounded overflow-hidden flex items-center justify-center shrink-0">
                    <img 
                      src={`data:image/png;base64,${imageBase64}`}
                      alt="Source Silhouette Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <span className="font-bold block text-[var(--color-accent-gold)]">Loaded Image:</span>
                      <span className="text-[var(--color-text-muted)] font-mono">{sourceFilename}</span>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="font-semibold block text-[10px]">Shape Name</label>
                        <input 
                          type="text"
                          className="editor-input w-full"
                          value={shapeName}
                          onChange={e => setShapeName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))}
                          placeholder="e.g. custom_pegasus"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                sourceType === 'upload' && (
                  <div className="text-center p-8 border border-dashed border-[var(--color-border-parchment)] text-[var(--color-text-muted)]">
                    No image file selected. Please click upload to select an image.
                  </div>
                )
              )}

              {/* Tracing parameters */}
              {imageBase64 && (
                <div className="space-y-3 p-4 border border-[var(--color-border-parchment)] rounded bg-black/10">
                  <button 
                    onClick={() => setShowAdvancedTrace(!showAdvancedTrace)}
                    className="flex items-center gap-1 font-bold text-[var(--color-accent-gold)] cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" /> 
                    {showAdvancedTrace ? 'Hide Tracing Controls' : 'Show Advanced Tracing Controls'}
                  </button>

                  {showAdvancedTrace && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--color-border-parchment)]/30">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label>Turdsize (Stray spot culling)</label>
                          <span className="font-bold font-mono">{turdsize}px</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="40"
                          className="w-full"
                          value={turdsize}
                          onChange={e => setTurdsize(parseInt(e.target.value))}
                        />
                        <span className="text-[9px] text-[var(--color-text-muted)] block">Turdsize ignores small artifacts/spots smaller than this pixel radius.</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label>Alphamax (Corner threshold)</label>
                          <span className="font-bold font-mono">{alphamax.toFixed(2)}</span>
                        </div>
                        <input 
                          type="range"
                          min="0.0"
                          max="1.3"
                          step="0.05"
                          className="w-full"
                          value={alphamax}
                          onChange={e => setAlphamax(parseFloat(e.target.value))}
                        />
                        <span className="text-[9px] text-[var(--color-text-muted)] block">Controls corner sharpness. Lower makes shapes more angular, higher more circular.</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleTraceImage}
                      disabled={isTracing}
                      className="px-5 py-2.5 bg-[var(--color-accent-gold)] text-[#2b2316] font-bold rounded flex items-center gap-2 hover:bg-[var(--color-accent-gold)]/80 disabled:opacity-50 transition-all font-title uppercase tracking-wider text-[10px]"
                    >
                      {isTracing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Tracing Path...
                        </>
                      ) : (
                        <>
                          Trace Image & Generate Skeletons <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview Outline & Constellation */}
          {step === 'preview-save' && tracedSvgContent && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-title text-sm tracking-wider uppercase text-[var(--color-accent-gold)]">
                  Preview Vector Silhouette & Constellation Graph
                </h4>
                {selectedShapeToEdit ? (
                  <button 
                    onClick={() => {
                      setSelectedShapeToEdit(null);
                      setStep('edit-list');
                    }}
                    className="text-[var(--color-text-muted)] hover:underline flex items-center gap-1 font-bold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to library
                  </button>
                ) : (
                  <button 
                    onClick={() => setStep('configure-generate')}
                    className="text-[var(--color-text-muted)] hover:underline flex items-center gap-1 font-bold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back to configurations
                  </button>
                )}
              </div>

              {/* 2-Column Previews */}
              <div className="grid grid-cols-2 gap-6">
                
                {/* Column Left: Outline Preview */}
                <div className="space-y-2 text-center">
                  <span className="font-bold block text-[var(--color-accent-gold)] uppercase tracking-wider text-[10px]">
                    Custom Shape Outline
                  </span>
                  <div className="border border-[var(--color-border-parchment)] bg-[#0f172a] rounded overflow-hidden p-1 flex justify-center shadow-lg">
                    <canvas 
                      ref={outlineCanvasRef}
                      width={200}
                      height={200}
                      className="max-w-full aspect-square bg-[#0f172a]"
                    />
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block leading-relaxed px-2">
                    Standard rendering for custom planets, stations, or sargasso clouds on the Navigation Map.
                  </span>
                </div>

                {/* Column Right: Constellation Skeleton Preview */}
                <div className="space-y-2 text-center">
                  <span className="font-bold block text-[var(--color-accent-gold)] uppercase tracking-wider text-[10px]">
                    Constellation Geometry (LOD {selectedLOD})
                  </span>
                  <div className="border border-[var(--color-border-parchment)] bg-[#0f172a] rounded overflow-hidden p-1 flex justify-center shadow-lg">
                    <canvas 
                      ref={constellationCanvasRef}
                      width={200}
                      height={200}
                      className="max-w-full aspect-square bg-[#0f172a]"
                    />
                  </div>
                  <span className="text-[10px] text-[var(--color-text-muted)] block leading-relaxed px-2">
                    Pre-computed geometric graph nodes and connections drawn when constellation outline is set to 'internal'.
                  </span>
                </div>

              </div>

              {/* Detail level adjustment */}
              <div className="bg-black/10 p-4 border border-[var(--color-border-parchment)] rounded space-y-2">
                <div className="flex justify-between font-bold">
                  <span className="text-[var(--color-accent-gold)]">Preview Constellation Detail Level (LOD)</span>
                  <span className="font-mono">LOD {selectedLOD} ({selectedLOD * 5} nodes)</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="20"
                  className="w-full cursor-pointer"
                  value={selectedLOD}
                  onChange={e => setSelectedLOD(parseInt(e.target.value))}
                />
                <span className="text-[9px] text-[var(--color-text-muted)] block">
                  Constellations on the chart automatically switch detail levels matching their `constellationDetail` parameter (1 to 20).
                </span>
              </div>

              {/* Save actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-base)] transition-colors rounded uppercase font-bold text-[10px] tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveShape}
                  className="px-6 py-2 bg-[var(--color-accent-gold)] text-[#2b2316] font-bold rounded flex items-center gap-2 hover:bg-[var(--color-accent-gold)]/80 transition-all font-title uppercase tracking-wider text-[10px]"
                >
                  <Check className="w-3.5 h-3.5" /> Save Shape & Skeletons
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Edit Custom Shapes Library */}
          {step === 'edit-list' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-title text-sm tracking-wider uppercase text-[var(--color-accent-gold)]">
                  Library Custom Shapes
                </h4>
                <button 
                  onClick={() => setStep('source-selection')}
                  className="text-[var(--color-text-muted)] hover:underline flex items-center gap-1 font-bold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to wizard start
                </button>
              </div>

              <div className="border border-[var(--color-border-parchment)] rounded bg-black/10 max-h-[300px] overflow-y-auto">
                {availableShapes.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[var(--color-border-parchment)] bg-black/20 text-[var(--color-accent-gold)] uppercase tracking-wider font-bold">
                        <th className="p-3">Shape Name</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableShapes.map(name => (
                        <tr 
                          key={name} 
                          className="border-b border-[var(--color-border-parchment)]/30 hover:bg-[var(--color-bg-base)] transition-colors"
                        >
                          <td className="p-3 font-mono font-bold text-[var(--color-text-main)]">
                            {name}
                          </td>
                          <td className="p-3 text-right flex justify-end gap-1">
                            <button
                              onClick={() => handleEditShapeSelect(name)}
                              className="px-2.5 py-1 text-[9px] font-bold border border-[var(--color-border-parchment)] text-[var(--color-text-muted)] hover:bg-[var(--color-accent-gold)] hover:text-[#2b2316] transition-colors rounded uppercase"
                              title="Edit/Preview shape details"
                            >
                              Edit & Preview
                            </button>
                            <button
                              onClick={() => handleDeleteShape(name)}
                              className="px-2.5 py-1 text-[9px] font-bold border border-[var(--color-accent-red)]/35 text-[var(--color-accent-red)] hover:bg-[var(--color-accent-red)] hover:text-white transition-colors rounded uppercase flex items-center gap-1"
                              title="Delete shape files"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-[var(--color-text-muted)]">
                    No custom shapes found. Generate or trace a new shape using the wizard!
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
