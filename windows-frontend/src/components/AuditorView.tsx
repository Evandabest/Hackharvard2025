
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PlayCircle, FileSearch, File, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AuditorView: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (fileToRemove: File) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleRunAudit = () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    // Mock processing
    const phases = [
      { name: "Uploading...", progress: 10 },
      { name: "Queued...", progress: 25 },
      { name: "Extracting...", progress: 50 },
      { name: "Analyzing...", progress: 75 },
      { name: "Complete", progress: 100 },
    ];
    let currentPhase = 0;
    const interval = setInterval(() => {
      setPhase(phases[currentPhase].name);
      setProgress(phases[currentPhase].progress);
      currentPhase++;
      if (currentPhase === phases.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsProcessing(false);
          setFiles([]);
          setProgress(0);
          setPhase('');
        }, 2000);
      }
    }, 1500);
  };

  return (
    <div className="w-full h-full flex p-4 space-x-4 text-white">
      {/* Left side: Audit Button */}
      <div
        className="w-1/3 h-full bg-white bg-opacity-10 rounded-lg flex flex-col justify-center items-center space-y-2 cursor-pointer hover:bg-opacity-20 transition-all"
        onClick={handleRunAudit}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center"
            >
              <div className="w-16 h-16 relative flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-gray-500"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                  />
                  <motion.circle
                    className="text-blue-400"
                    strokeWidth="10"
                    strokeDasharray={2 * Math.PI * 45}
                    strokeDashoffset={2 * Math.PI * 45 * (1 - progress / 100)}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="45"
                    cx="50"
                    cy="50"
                    transform="rotate(-90 50 50)"
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - progress / 100) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <span className="absolute text-sm font-bold">{progress}%</span>
              </div>
              <p className="text-gray-300 text-xs mt-2">{phase}</p>
            </motion.div>
          ) : (
            <motion.div
              key="play"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="text-center"
            >
              <PlayCircle className="w-10 h-10 text-gray-300" />
              <p className="text-gray-300 font-semibold mt-1">Run Audit</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right side: Drop Zone */}
      <div
        {...getRootProps()}
        className={`w-2/3 h-full border-2 border-dashed rounded-lg flex justify-center items-center transition-all ${
          isDragActive ? 'border-blue-400 bg-white bg-opacity-10' : 'border-white border-opacity-20'
        }`}
      >
        <input {...getInputProps()} />
        {files.length === 0 ? (
          <div className="text-center text-gray-400">
            <FileSearch className="w-12 h-12 mx-auto" />
            <p className="mt-2 font-medium">Drop PDF or CSV here</p>
          </div>
        ) : (
          <div className="w-full h-full p-2 overflow-y-auto">
            {files.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between bg-white bg-opacity-5 rounded p-2 mb-2"
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  <File className="w-5 h-5 text-gray-300 flex-shrink-0" />
                  <span className="truncate text-sm">{file.name}</span>
                </div>
                <button onClick={() => removeFile(file)} className="p-1 rounded-full hover:bg-white hover:bg-opacity-10">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
