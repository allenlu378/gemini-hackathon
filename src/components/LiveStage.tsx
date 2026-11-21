import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  MonitorUp,
  Pencil,
  Scissors,
  SlidersHorizontal,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  formatClockDuration,
  getFallbackAnimalAvatar,
  partitionParticipants,
  STREAM_CATEGORIES,
  validateDisplayName,
} from '../utils/streamUtils';
import type {
  ClipMarkerEvent,
  ParticipantRole,
  RoomParticipant,
  RoomSummary,
  StreamCategory,
} from '../utils/types';
import type { MediaDeviceOption, StudioProfile } from '../hooks/useStudioRoom';

interface VideoTileProps {
  participant: RoomParticipant;
  stream: MediaStream | null;
  relayFrame?: string;
  isSelf: boolean;
}

function ParticipantVideoTile({ participant, stream, relayFrame, isSelf }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [remoteMuted, setRemoteMuted] = useState(false);
  const [hasLiveVideoFrame, setHasLiveVideoFrame] = useState(false);

  const isVideoActive = participant.videoEnabled || participant.screenSharing;

  useEffect(() => {
    setHasLiveVideoFrame(false);
  }, [stream, isVideoActive]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && isVideoActive) {
      el.srcObject = stream;
      el.muted = isSelf || remoteMuted;
      if (el.readyState >= 2 && el.videoWidth > 0) {
        setHasLiveVideoFrame(true);
      }
      el.play().catch(() => {
        if (!isSelf && !el.muted) {
          el.muted = true;
          setRemoteMuted(true);
          el.play().catch(() => {});
        }
      });
    } else {
      el.srcObject = null;
      setHasLiveVideoFrame(false);
    }
  }, [stream, isVideoActive, isSelf, remoteMuted]);

  const fallbackAvatar =
    participant.avatarUrl || getFallbackAnimalAvatar(participant.id).url;

  const showRelayImage = !isSelf && isVideoActive && !hasLiveVideoFrame && Boolean(relayFrame);

  return (
    <div
      data-testid={`video-tile-${participant.id}`}
      className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/90 shadow-xs"
    >
      {stream && isVideoActive && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf || remoteMuted}
          onLoadedData={() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              setHasLiveVideoFrame(true);
            }
          }}
          onResize={() => {
            if (videoRef.current && videoRef.current.videoWidth > 0) {
              setHasLiveVideoFrame(true);
            }
          }}
          className={showRelayImage ? 'hidden' : 'w-full h-full object-cover'}
        />
      )}

      {showRelayImage ? (
        <img
          src={relayFrame}
          alt={`${participant.name} live stream`}
          className="w-full h-full object-cover"
        />
      ) : !stream || !isVideoActive ? (
        <div className="w-full h-full bg-gradient-to-br from-slate-50 via-white to-slate-100/90 flex items-center justify-center p-4 pb-12">
          {!imgFailed ? (
            <img
              src={fallbackAvatar}
              alt={`${participant.name} profile avatar`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover ring-4 ring-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-slate-200/80 ring-4 ring-white shadow-md flex items-center justify-center">
              <span className="font-display text-2xl font-bold text-slate-600">
                {participant.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {!isSelf && (stream || relayFrame) && (
        <button
          type="button"
          onClick={() => {
            const nextMuted = !remoteMuted;
            setRemoteMuted(nextMuted);
            if (videoRef.current) {
              videoRef.current.muted = nextMuted;
              videoRef.current.play().catch(() => {});
            }
          }}
          aria-label={remoteMuted ? `Unmute ${participant.name}` : `Mute ${participant.name}`}
          className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 hover:bg-white text-slate-900 border border-slate-200/80 shadow-xs backdrop-blur-sm transition-colors"
        >
          {remoteMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 pointer-events-none">
        <div className="max-w-[85%] px-3 py-1.5 rounded-xl bg-slate-950/75 backdrop-blur-md text-white">
          <p className="text-xs font-semibold truncate">
            {participant.name} {isSelf ? '(You)' : ''}
          </p>
          <p className="text-[11px] text-slate-200 truncate">
            <span className="capitalize">{participant.role}</span> ·{' '}
            {participant.screenSharing
              ? 'Screen'
              : participant.videoEnabled
                ? 'Camera On'
                : 'Camera Off'}{' '}
            · {participant.audioEnabled ? 'Mic On' : 'Muted'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface LiveStageProps {
  roomId: string;
  roomTitle: string;
  roomCategory: StreamCategory;
  isLive: boolean;
  streamStartedAt: number | null;
  isAutoRecording: boolean;
  lastClipMarker: ClipMarkerEvent | null;
  selfId: string | null;
  selfName: string;
  selfRole: ParticipantRole;
  participants: RoomParticipant[];
  directoryRooms: RoomSummary[];
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  remoteRelayFrames: Record<string, string>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  audioLevel: number;
  mediaNotice: string | null;
  audioDevices: MediaDeviceOption[];
  videoDevices: MediaDeviceOption[];
  selectedAudioId: string;
  selectedVideoId: string;
  showRoomSwitcher: boolean;
  onCloseRoomSwitcher: () => void;
  onJoinRoom: (
    roomId: string,
    profile: StudioProfile,
    meta?: { title?: string; category?: StreamCategory }
  ) => void;
  onUpdateRoomMeta: (meta: { title?: string; category?: StreamCategory }) => void;
  onSwitchInputDevice: (audioId: string, videoId: string) => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onTriggerClipMark: (source?: 'manual' | 'voice') => void;
}

export function LiveStage({
  roomId,
  roomTitle,
  roomCategory,
  isLive,
  streamStartedAt,
  isAutoRecording,
  lastClipMarker,
  selfId,
  selfName,
  selfRole,
  participants,
  directoryRooms,
  localStream,
  remoteStreams,
  remoteRelayFrames,
  audioEnabled,
  videoEnabled,
  screenSharing,
  audioLevel,
  mediaNotice,
  audioDevices,
  videoDevices,
  selectedAudioId,
  selectedVideoId,
  showRoomSwitcher,
  onCloseRoomSwitcher,
  onJoinRoom,
  onUpdateRoomMeta,
  onSwitchInputDevice,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onTriggerClipMark,
}: LiveStageProps) {
  const [editingMeta, setEditingMeta] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [titleDraft, setTitleDraft] = useState(roomTitle);
  const [categoryDraft, setCategoryDraft] = useState<StreamCategory>(roomCategory);
  const [nameInput, setNameInput] = useState(selfName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState(roomId);
  const [roleInput, setRoleInput] = useState<ParticipantRole>('cohost');
  const [liveClockSec, setLiveClockSec] = useState(0);

  useEffect(() => {
    setTitleDraft(roomTitle);
    setCategoryDraft(roomCategory);
  }, [roomCategory, roomTitle]);

  useEffect(() => {
    setNameInput(selfName);
  }, [selfName]);

  useEffect(() => {
    setRoomInput(roomId);
  }, [roomId]);

  useEffect(() => {
    if (!isLive || !streamStartedAt) {
      setLiveClockSec(0);
      return;
    }
    const interval = window.setInterval(() => {
      setLiveClockSec(Math.max(0, Math.floor((Date.now() - streamStartedAt) / 1000)));
    }, 500);
    return () => window.clearInterval(interval);
  }, [isLive, streamStartedAt]);

  const { broadcasters, viewers } = partitionParticipants(participants);

  const handleRoomSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateDisplayName(nameInput);
    if (!check.ok) {
      setNameError(check.reason);
      return;
    }
    setNameError(null);
    onJoinRoom(roomInput, {
      name: check.name,
      handle: '',
      role: roleInput,
    });
    onCloseRoomSwitcher();
  };

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRoomMeta({ title: titleDraft.trim() || roomTitle, category: categoryDraft });
    setEditingMeta(false);
  };

  const gridColsClass =
    broadcasters.length <= 1
      ? 'grid-cols-1 max-w-4xl mx-auto w-full'
      : broadcasters.length === 2
        ? 'grid-cols-1 md:grid-cols-2 w-full'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 w-full';

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-[#FAFAFB] lg:overflow-y-auto">
      {/* Inline Room Switcher Drawer */}
      {showRoomSwitcher && (
        <div className="px-5 md:px-7 py-5 bg-white border-b border-slate-200/80 space-y-4">
          <form onSubmit={handleRoomSwitch} noValidate className="flex flex-wrap items-end gap-3.5">
            <div className="min-w-[160px] flex-1">
              <label htmlFor="studio-name" className="block text-xs font-medium text-slate-600 mb-1.5">
                Display Name
              </label>
              <input
                id="studio-name"
                type="text"
                required
                maxLength={32}
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="Enter your name"
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-950 focus:bg-white focus:outline-none transition-colors ${
                  nameError
                    ? 'border-rose-400 focus:border-rose-600'
                    : 'border-slate-200 focus:border-slate-900'
                }`}
              />
            </div>
            <div className="min-w-[160px] flex-1">
              <label htmlFor="studio-room" className="block text-xs font-medium text-slate-600 mb-1.5">
                Room Slug
              </label>
              <input
                id="studio-room"
                type="text"
                required
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-950 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
              />
            </div>
            <div className="min-w-[180px]">
              <label htmlFor="studio-role" className="block text-xs font-medium text-slate-600 mb-1.5">
                Role
              </label>
              <select
                id="studio-role"
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value as ParticipantRole)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-950 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
              >
                <option value="host">Host (Camera + Mic)</option>
                <option value="cohost">Co-Host (On Stage)</option>
                <option value="viewer">Viewer (Watch &amp; Chat)</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-colors whitespace-nowrap"
            >
              Join Room
            </button>
          </form>

          {nameError && (
            <p role="alert" className="text-xs text-rose-600 font-medium">
              {nameError}
            </p>
          )}

          {directoryRooms.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Active rooms</span>
              {directoryRooms.slice(0, 5).map((r) => (
                <button
                  key={r.roomId}
                  type="button"
                  onClick={() => {
                    const check = validateDisplayName(nameInput || selfName);
                    if (!check.ok) {
                      setNameError(check.reason);
                      return;
                    }
                    onJoinRoom(r.roomId, {
                      name: check.name,
                      handle: '',
                      role: roleInput,
                    });
                    onCloseRoomSwitcher();
                  }}
                  className="hover:text-slate-950 transition-colors whitespace-nowrap tabular-nums"
                >
                  <span className="font-medium text-slate-800">{r.title}</span>{' '}
                  <span className="text-slate-400">
                    ({r.isLive ? 'Live · ' : ''}
                    {r.broadcasterCount} on stage)
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stream Context Header */}
      <div className="px-5 md:px-7 pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-xl font-semibold tracking-tight text-slate-950 truncate">
              {roomTitle}
            </h1>
            {selfRole !== 'viewer' && (
              <button
                type="button"
                onClick={() => setEditingMeta((v) => !v)}
                aria-label="Edit stream title and category"
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-rose-600 tabular-nums">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" aria-hidden="true" />
                LIVE · {formatClockDuration(liveClockSec)}
                {isAutoRecording && (
                  <span className="text-slate-500 font-normal">· Auto-buffering</span>
                )}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {roomCategory} · Room <span className="font-mono text-slate-700">{roomId}</span> ·{' '}
            {broadcasters.length} on stage · {viewers.length} watching
          </p>
        </div>
      </div>

      {/* Inline Stream Info Editor */}
      {editingMeta && (
        <form
          onSubmit={handleSaveMeta}
          className="mx-5 md:mx-7 mb-4 p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-wrap items-end gap-3 shadow-xs"
        >
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="edit-stream-title" className="block text-xs font-medium text-slate-600 mb-1">
              Stream Title
            </label>
            <input
              id="edit-stream-title"
              type="text"
              required
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-950 focus:bg-white focus:outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label htmlFor="edit-stream-category" className="block text-xs font-medium text-slate-600 mb-1">
              Category
            </label>
            <select
              id="edit-stream-category"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value as StreamCategory)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-950 focus:bg-white focus:outline-none focus:border-slate-900"
            >
              {STREAM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-colors"
          >
            Save
          </button>
        </form>
      )}

      {/* Momentary Clip Marker Confirmation */}
      {lastClipMarker && (
        <div
          role="status"
          aria-live="polite"
          className="mx-5 md:mx-7 mb-4 px-4 py-2.5 rounded-xl bg-slate-950 text-white flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <Scissors className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            <span>
              Clip marked at{' '}
              <span className="font-mono tabular-nums">
                {formatClockDuration(lastClipMarker.streamTimeSec)}
              </span>{' '}
              by {lastClipMarker.triggeredBy} (
              {lastClipMarker.source === 'voice' ? 'Voice "Clip That"' : 'Manual'})
            </span>
          </span>
          <span className="text-slate-300">Ready for downstream clipping</span>
        </div>
      )}

      {/* Subtle status notice if camera unavailable */}
      {mediaNotice && (
        <div className="mx-5 md:mx-7 mb-4 px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-500">
          {mediaNotice}
        </div>
      )}

      {/* Main Video Stage + Sleek Control Dock */}
      <div className="px-5 md:px-7 pb-6 flex-1 flex flex-col gap-5">
        <div className="flex-1 flex items-center">
          <div className={`grid gap-4 ${gridColsClass}`} data-testid="stage-video-grid">
            {broadcasters.length === 0 ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs flex items-center justify-center p-8 text-center">
                <div className="max-w-sm space-y-1.5">
                  <p className="font-display text-lg font-semibold text-slate-900">
                    {selfRole === 'viewer' ? 'Waiting for the stream' : 'Preparing your stage'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selfRole === 'viewer'
                      ? 'No broadcasters are currently on stage in this room.'
                      : 'Connecting media devices and room signaling...'}
                  </p>
                </div>
              </div>
            ) : (
              broadcasters.map((p) => {
                const isSelf = p.id === selfId;
                const stream = isSelf ? localStream : remoteStreams[p.id] || null;
                const relayFrame = isSelf ? undefined : remoteRelayFrames[p.id];
                return (
                  <ParticipantVideoTile
                    key={p.id}
                    participant={p}
                    stream={stream}
                    relayFrame={relayFrame}
                    isSelf={isSelf}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Sleek Broadcast Control Dock */}
        {selfRole !== 'viewer' ? (
          <div className="max-w-4xl mx-auto w-full bg-white border border-slate-200/90 rounded-2xl px-4 py-3 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleAudio}
                  aria-pressed={!audioEnabled}
                  aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                    audioEnabled
                      ? 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {audioEnabled ? (
                    <Mic className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <MicOff className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{audioEnabled ? 'Mic' : 'Muted'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleVideo}
                  aria-pressed={!videoEnabled}
                  aria-label={videoEnabled ? 'Turn camera off' : 'Turn camera on'}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                    videoEnabled
                      ? 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  {videoEnabled ? (
                    <Video className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <VideoOff className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{videoEnabled ? 'Camera' : 'Cam Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleScreenShare}
                  aria-pressed={screenSharing}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                    screenSharing
                      ? 'bg-slate-950 text-white border-slate-950'
                      : 'bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <MonitorUp className="w-4 h-4" aria-hidden="true" />
                  <span>{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
                </button>

                {(audioDevices.length > 0 || videoDevices.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowDevices((v) => !v)}
                    aria-expanded={showDevices}
                    aria-label="Audio and video devices"
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap ${
                      showDevices
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Devices</span>
                  </button>
                )}

                <div
                  aria-hidden="true"
                  className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70"
                >
                  <span className="text-[11px] font-mono text-slate-500">IN</span>
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 transition-all duration-75"
                      style={{ width: `${audioEnabled ? audioLevel : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTriggerClipMark('manual')}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                <Scissors className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clip That</span>
              </button>
            </div>

            {showDevices && (audioDevices.length > 0 || videoDevices.length > 0) && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                {audioDevices.length > 0 && (
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <span>Microphone</span>
                    <select
                      value={selectedAudioId}
                      onChange={(e) => onSwitchInputDevice(e.target.value, selectedVideoId)}
                      className="max-w-[200px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900"
                    >
                      <option value="">Default Microphone</option>
                      {audioDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {videoDevices.length > 0 && (
                  <label className="inline-flex items-center gap-2 text-slate-600">
                    <span>Camera</span>
                    <select
                      value={selectedVideoId}
                      onChange={(e) => onSwitchInputDevice(selectedAudioId, e.target.value)}
                      className="max-w-[200px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900"
                    >
                      <option value="">Default Camera</option>
                      {videoDevices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto w-full bg-white border border-slate-200/90 rounded-2xl px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              Watching as a viewer. Chat live on the right or step onto the stage anytime.
            </p>
            <button
              type="button"
              onClick={() =>
                onJoinRoom(roomId, {
                  name: selfName,
                  handle: '',
                  role: 'cohost',
                })
              }
              className="px-4 py-2 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-colors whitespace-nowrap"
            >
              Join Stage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
