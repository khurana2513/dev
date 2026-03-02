import { useState, useEffect } from "react";
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
  const isAddSubType = operationType === "add_sub" || operationType === "integer_add_sub";
  
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
        <label className="block text-sm font-bold text-slate-700 dark:text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Time Limit per Question
        </label>
        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
          {formatValue(value)}
        </div>
      </div>

      {/* Premium Slider */}
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-2 bg-gradient-to-r from-slate-200 via-indigo-200 to-purple-200 dark:from-slate-700 dark:via-indigo-800 dark:to-purple-800 rounded-full opacity-30"></div>
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

      {/* Difficulty Preset Buttons - Premium Design */}
      <div className="pt-2">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Difficulty Presets:</div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handlePresetClick("easy")}
            className={`group relative px-3.5 py-2 text-sm font-bold rounded-xl transition-all duration-300 transform whitespace-nowrap ${
              difficultyMode === "easy"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl scale-105 ring-2 ring-green-300 dark:ring-green-500/50"
                : "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 hover:shadow-lg hover:scale-105 border-2 border-green-200 dark:border-green-700"
            } hover:-translate-y-0.5 active:scale-100`}
          >
            <span className="relative z-10">{presets.easy.label}</span>
            {difficultyMode === "easy" && (
              <span className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
            )}
          </button>
          <button
            onClick={() => handlePresetClick("medium")}
            className={`group relative px-3.5 py-2 text-sm font-bold rounded-xl transition-all duration-300 transform whitespace-nowrap ${
              difficultyMode === "medium"
                ? "bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-xl scale-105 ring-2 ring-yellow-300 dark:ring-yellow-500/50"
                : "bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 text-yellow-700 dark:text-yellow-400 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/50 dark:hover:to-orange-900/50 hover:shadow-lg hover:scale-105 border-2 border-yellow-200 dark:border-yellow-700"
            } hover:-translate-y-0.5 active:scale-100`}
          >
            <span className="relative z-10">{presets.medium.label}</span>
            {difficultyMode === "medium" && (
              <span className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
            )}
          </button>
          <button
            onClick={() => handlePresetClick("hard")}
            className={`group relative px-3.5 py-2 text-sm font-bold rounded-xl transition-all duration-300 transform whitespace-nowrap ${
              difficultyMode === "hard"
                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-xl scale-105 ring-2 ring-red-300 dark:ring-red-500/50"
                : "bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 text-red-700 dark:text-red-400 hover:from-red-100 hover:to-pink-100 dark:hover:from-red-900/50 dark:hover:to-pink-900/50 hover:shadow-lg hover:scale-105 border-2 border-red-200 dark:border-red-700"
            } hover:-translate-y-0.5 active:scale-100`}
          >
            <span className="relative z-10">{presets.hard.label}</span>
            {difficultyMode === "hard" && (
              <span className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
            )}
          </button>
          <button
            onClick={handleCustomClick}
            className={`group relative px-3.5 py-2 text-sm font-bold rounded-xl transition-all duration-300 transform whitespace-nowrap ${
              difficultyMode === "custom"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl scale-105 ring-2 ring-indigo-300 dark:ring-indigo-500/50"
                : "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-400 hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50 hover:shadow-lg hover:scale-105 border-2 border-indigo-200 dark:border-indigo-700"
            } hover:-translate-y-0.5 active:scale-100`}
          >
            <span className="relative z-10">Custom</span>
            {difficultyMode === "custom" && (
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></span>
            )}
          </button>
        </div>
      </div>

      {/* Value Range Display */}
      <div className="flex justify-between items-center pt-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
          Min: {formatValue(minValue)}
        </span>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-lg">
          Max: {formatValue(maxValue)}
        </span>
      </div>
    </div>
  );
}
