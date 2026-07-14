import React, { useRef } from 'react';

interface FacebookDashVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  audioUrl?: string;
}

export const FacebookDashVideo: React.FC<FacebookDashVideoProps> = ({
  audioUrl,
  onPlay,
  onPause,
  onSeeking,
  onTimeUpdate,
  onVolumeChange,
  ...videoProps
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const syncPosition = (video: HTMLVideoElement) => {
    const audio = audioRef.current;
    if (!audio || audio.readyState === 0 || !Number.isFinite(video.currentTime)) return;
    try {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.25) {
        audio.currentTime = video.currentTime;
      }
      audio.playbackRate = video.playbackRate;
    } catch {
      // Metadata may arrive a moment after the video stream.
    }
  };

  return (
    <>
      <video
        {...videoProps}
        ref={videoRef}
        onPlay={(event) => {
          const video = event.currentTarget;
          const audio = audioRef.current;
          if (audio) {
            syncPosition(video);
            audio.volume = video.volume;
            audio.muted = video.muted;
            void audio.play().then(() => syncPosition(video)).catch(() => undefined);
          }
          onPlay?.(event);
        }}
        onPause={(event) => {
          audioRef.current?.pause();
          onPause?.(event);
        }}
        onSeeking={(event) => {
          syncPosition(event.currentTarget);
          onSeeking?.(event);
        }}
        onTimeUpdate={(event) => {
          syncPosition(event.currentTarget);
          onTimeUpdate?.(event);
        }}
        onVolumeChange={(event) => {
          const audio = audioRef.current;
          if (audio) {
            audio.volume = event.currentTarget.volume;
            audio.muted = event.currentTarget.muted;
          }
          onVolumeChange?.(event);
        }}
      />
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onLoadedMetadata={() => {
            const video = videoRef.current;
            const audio = audioRef.current;
            if (!video || !audio) return;
            syncPosition(video);
            audio.volume = video.volume;
            audio.muted = video.muted;
            if (!video.paused) void audio.play().catch(() => undefined);
          }}
        />
      )}
    </>
  );
};
