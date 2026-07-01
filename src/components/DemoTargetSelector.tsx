'use client';

import { useState } from 'react';
import { DEMO_TARGETS, DemoTarget } from '@/lib/demo-targets';
import { Target, Zap, ChevronRight, Beaker } from 'lucide-react';

interface DemoTargetSelectorProps {
  onSelect: (domain: string) => void;
  disabled: boolean;
}

export default function DemoTargetSelector({ onSelect, disabled }: DemoTargetSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 mx-auto px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-all"
        >
          <Beaker className="w-4 h-4" />
          {expanded ? 'Hide' : 'Show'} Demo Targets
        </button>

        {expanded && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_TARGETS.map((target) => (
              <button
                key={target.domain}
                onClick={() => { onSelect(target.domain); setExpanded(false); }}
                disabled={disabled}
                className="text-left p-4 bg-[#111827] border border-gray-800 hover:border-cyan-500/50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-sm text-white">{target.domain}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-all" />
                </div>
                <p className="text-xs text-gray-400 mb-2">{target.description}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    target.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                    target.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {target.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">
                    {target.expectedFindings.length} expected findings
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
