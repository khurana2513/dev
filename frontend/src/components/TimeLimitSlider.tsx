import { Clock } from "lucide-react";

interface TimeLimitSliderProps {
  value: number;
  onChange: (value: number) => void;
  operationType: "add_sub" | "integer_add_sub" | string;
  difficultyMode: "custom" | "easy" | "medium" | "hard";
  onDifficultyChange: (mode: "custom" | "easy" | "medium" | "hard") => void;
}

export default function TimeLimitSlider({
  value,
  onChange,
  operationType,
  difficultyMode,
  onDifficultyChange,
}: TimeLimitSliderProps) {
  const isAddSubType = operationType === "add_sub" || operationType === "integer_add_sub" || operationType === "intl_add_sub";
  
  // For Add/Sub: 0.1s to 5.0s with steps: 0.1s (0.1-1.0), then 0.5s (1.5-5.0)
  // For Others: 1s to 40s with 1s steps
  const minValue = isAddSubType ? 0.1 : 1;
  const maxValue = isAddSubType ? 5.0 : 40;
  
  // Generate step values
  const getStepValues = (): number[] => {
    if (isAddSubType) {
      const steps: number[] = [];
      // 0.1s to 1.0s in 0.1s increments
      for (let i = 0.1; i <= 1.0; i += 0.1) {
        steps.push(Math.round(i * 10) / 10);
      }
      // Add 1.2s and 1.8s (preset values)
      steps.push(1.2);
      steps.push(1.8);
      // 1.5s to 5.0s in 0.5s increments
      for (let i = 1.5; i <= 5.0; i += 0.5) {
        steps.push(Math.round(i * 10) / 10);
      }
      // Sort and remove duplicates
      return [...new Set(steps)].sort((a, b) => a - b);
    } else {
      // 1s to 40s in 1s increments
      const steps: number[] = [];
      for (let i = 1; i <= 40; i += 1) {
        steps.push(i);
      }
      return steps;
    }
  };

  const stepValues = getStepValues();
  
  // Find the closest step value to the current value
  const findClosestIndex = (targetValue: number): number => {
    let closestIndex = 0;
    let minDiff = Math.abs(stepValues[0] - targetValue);
    for (let i = 1; i < stepValues.length; i++) {
      const diff = Math.abs(stepValues[i] - targetValue);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    }
    return closestIndex;
  };
  
  const sliderValue = findClosestIndex(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    const newValue = stepValues[index];
    if (newValue !== undefined) {
      onChange(newValue);
      onDifficultyChange("custom");
    }
  };

  // Difficulty presets - fixed values, not ranges
  const getDifficultyPresets = () => {
    if (isAddSubType) {
      return {
        easy: { value: 1.8, label: "Easy" },
        medium: { value: 1.2, label: "Medium" },
        hard: { value: 0.6, label: "Hard" },
      };
    } else {
      return {
        easy: { value: 30, label: "Easy" },
        medium: { value: 20, label: "Medium" },
        hard: { value: 10, label: "Hard" },
      };
    }
  };

  const presets = getDifficultyPresets();

  const handlePresetClick = (mode: "easy" | "medium" | "hard") => {
    const preset = presets[mode];
    // Find closest step value to the preset value
    const closestStep = stepValues.reduce((prev, curr) => 
      Math.abs(curr - preset.value) < Math.abs(prev - preset.value) ? curr : prev
    );
    onChange(closestStep);
    onDifficultyChange(mode);
  };

  const handleCustomClick = () => {
    onDifficultyChange("custom");
  };

  const formatValue = (val: number): string => {
    if (isAddSubType) {
      return val < 1 ? `${val.toFixed(1)}s` : `${val.toFixed(1)}s`;
    }
    return `${Math.round(val)}s`;
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-bold  text-white flex items-center gap-2">
          <Clock className="w-4 h-4  text-indigo-400" />
          Time Limit per Question
        </label>
        <div className="text-lg font-bold  text-indigo-400  bg-indigo-900/30 px-3 py-1 rounded-lg">
          {formatValue(value)}
        </div>
      </div>

      {/* Premium Slider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-gradient-to-r from-slate-200 via-indigo-200 to-purple-200 from-slate-700 via-indigo-800 to-purple-800 rounded-full opacity-30"></div>
        </div>
        <input
          type="range"
          min={0}
          max={stepValues.length - 1}
          value={sliderValue}
          onChange={handleSliderChange}
          className={`relative w-full h-2 bg-transparent appearance-none cursor-pointer transition-all duration-300 z-10 hover:shadow-lg`}
          style={{
            background: `linear-gradient(to right, 
                  #6366f1 0%, 
                  #6366f1 ${(sliderValue / (stepValues.length - 1)) * 100}%, 
                  #8b5cf6 ${(sliderValue / (stepValues.length - 1)) * 100}%, 
                  #e2e8f0 ${(sliderValue / (stepValues.length - 1)) * 100}%, 
                  #e2e8f0 100%)`
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.8), inset 0 2px 4px rgba(255, 255, 255, 0.3);
            border: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
          }
          input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.7), 0 0 0 5px rgba(255, 255, 255, 0.9), inset 0 2px 4px rgba(255, 255, 255, 0.4);
          }
          input[type="range"]::-webkit-slider-thumb:active {
            transform: scale(1.15);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.6), 0 0 0 4px rgba(255, 255, 255, 0.8);
          }
          input[type="range"]::-moz-range-thumb {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.5), 0 0 0 4px rgba(255, 255, 255, 0.8);
            border: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 6px 20px rgba(99, 102, 241, 0.7), 0 0 0 5px rgba(255, 255, 255, 0.9);
          }
          input[type="range"]::-moz-range-thumb:active {
            transform: scale(1.15);
          }
        `}</style>
      </div>

      {/* Difficulty Preset Buttons */}
      <div style={{paddingTop:8}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,background:"rgba(15,17,32,.6)",borderRadius:12,padding:3,border:"1px solid rgba(255,255,255,.06)"}}>
          {([
            {mode:"easy" as const,label:presets.easy.label,color:"#10B981",bg:"rgba(16,185,129,.12)",bdr:"rgba(16,185,129,.3)"},
            {mode:"medium" as const,label:presets.medium.label,color:"#F59E0B",bg:"rgba(245,158,11,.12)",bdr:"rgba(245,158,11,.3)"},
            {mode:"hard" as const,label:presets.hard.label,color:"#EF4444",bg:"rgba(239,68,68,.12)",bdr:"rgba(239,68,68,.3)"},
            {mode:"custom" as const,label:"Custom",color:"#7B5CE5",bg:"rgba(123,92,229,.12)",bdr:"rgba(123,92,229,.3)"},
          ]).map(({mode,label,color,bg,bdr})=>{
            const active = difficultyMode === mode;
            return (
              <button
                key={mode}
                onClick={() => mode === "custom" ? handleCustomClick() : handlePresetClick(mode)}
                style={{
                  padding:"9px 0",
                  borderRadius:10,
                  border: active ? `1px solid ${bdr}` : "1px solid transparent",
                  background: active ? bg : "transparent",
                  fontFamily:"'DM Sans',sans-serif",
                  fontSize:12,
                  fontWeight:700,
                  letterSpacing:".02em",
                  cursor:"pointer",
                  transition:"all .2s",
                  color: active ? color : "rgba(200,204,224,.5)",
                  textAlign:"center",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Value Range Display */}
      <div className="flex justify-between items-center pt-2">
        <span className="text-xs font-semibold  text-slate-400  bg-slate-700/50 px-2.5 py-1 rounded-lg">
          Min: {formatValue(minValue)}
        </span>
        <span className="text-xs font-semibold  text-slate-400  bg-slate-700/50 px-2.5 py-1 rounded-lg">
          Max: {formatValue(maxValue)}
        </span>
      </div>
    </div>
  );
}
