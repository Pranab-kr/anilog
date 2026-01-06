import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const mainVariant = {
  initial: {
    x: 0,
    y: 0,
  },
  animate: {
    x: 10,
    y: -10,
    opacity: 0.9,
  },
};

const secondaryVariant = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

export const FileUpload = ({
  onChange,
  compact = false,
}: {
  onChange?: (files: File[]) => void;
  compact?: boolean;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    onChange && onChange(newFiles);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: handleFileChange,
    onDropRejected: (error) => {
      console.log(error);
    },
  });

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className={cn(
          "group/file block rounded-lg cursor-pointer w-full relative overflow-hidden border border-dashed border-border",
          compact ? "p-4" : "p-6"
        )}
      >
        <input
          ref={fileInputRef}
          id="file-upload-handle"
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={"file" + idx}
                  layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                  className={cn(
                    "relative overflow-hidden z-40 bg-secondary flex flex-col items-start justify-start p-3 w-full rounded-md",
                    "shadow-sm"
                  )}
                >
                  <div className="flex justify-between w-full items-center gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="text-sm text-foreground truncate max-w-[150px]"
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className="rounded px-2 py-0.5 w-fit shrink-0 text-xs text-muted-foreground bg-muted"
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            {!files.length && (
              <motion.div
                layoutId="file-upload"
                variants={mainVariant}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className={cn(
                  "relative group-hover/file:shadow-xl z-40 bg-secondary flex items-center justify-center rounded-md",
                  compact ? "h-16 w-16" : "h-20 w-20"
                )}
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-muted-foreground flex flex-col items-center text-xs"
                  >
                    Drop it
                    <IconUpload className="h-4 w-4 text-muted-foreground" />
                  </motion.p>
                ) : (
                  <IconUpload className="h-5 w-5 text-muted-foreground" />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className={cn(
                  "absolute opacity-0 border border-dashed border-primary inset-0 z-30 bg-transparent flex items-center justify-center rounded-md",
                  compact ? "h-16 w-16" : "h-20 w-20"
                )}
              ></motion.div>
            )}
          </div>
          <p className={cn(
            "relative z-20 font-medium text-foreground mt-3",
            compact ? "text-xs" : "text-sm"
          )}>
            {files.length > 0 ? "File selected" : "Upload file"}
          </p>
          <p className={cn(
            "relative z-20 text-muted-foreground mt-1 text-center",
            compact ? "text-xs" : "text-xs"
          )}>
            {files.length > 0 ? "Click to change" : "Drag & drop or click to upload"}
          </p>
        </div>
      </motion.div>
    </div>
  );
};
