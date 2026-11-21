import { useState } from 'react';
import { Shuffle, Video, Eye, ArrowRight } from 'lucide-react';
import {
  type AnimalAvatarOption,
  sanitizeRoomSlug,
  validateDisplayName,
} from '../utils/streamUtils';
import type { ParticipantRole, RoomSummary } from '../utils/types';

interface JoinStreamGateProps {
  initialRoomId: string;
  initialRole: ParticipantRole;
  avatar: AnimalAvatarOption;
  directoryRooms: RoomSummary[];
  onShuffleAvatar: () => void;
  onJoin: (params: {
    name: string;
    roomId: string;
    role: ParticipantRole;
    avatarUrl: string;
  }) => void;
}

export function JoinStreamGate({
  initialRoomId,
  initialRole,
  avatar,
  directoryRooms,
  onShuffleAvatar,
  onJoin,
}: JoinStreamGateProps) {
  const [nameInput, setNameInput] = useState('');
  const [roomInput, setRoomInput] = useState(initialRoomId);
  const [roleInput, setRoleInput] = useState<ParticipantRole>(
    initialRole === 'viewer' ? 'viewer' : 'host'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateDisplayName(nameInput);
    if (!check.ok) {
      setErrorMessage(check.reason);
      return;
    }
    setErrorMessage(null);
    onJoin({
      name: check.name,
      roomId: sanitizeRoomSlug(roomInput),
      role: roleInput,
      avatarUrl: avatar.url,
    });
  };

  const activeRooms = directoryRooms.filter(
    (r) => r.broadcasterCount + r.viewerCount > 0 || r.isLive
  );

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-slate-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-xs p-6 sm:p-8 space-y-6">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" aria-hidden="true" />
            <span className="font-display font-semibold tracking-tight text-slate-950 text-lg">
              ClipThat
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500">
            /{sanitizeRoomSlug(roomInput)}
          </span>
        </div>

        {/* Animal Profile Pic Preview */}
        <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
          <img
            src={avatar.url}
            alt={`${avatar.label} profile avatar`}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow-xs shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900">Your Camera-Off Avatar</p>
            <p className="text-xs text-slate-500 truncate">{avatar.label}</p>
          </div>
          <button
            type="button"
            onClick={onShuffleAvatar}
            aria-label="Shuffle animal avatar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shrink-0"
          >
            <Shuffle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Shuffle</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label
              htmlFor="join-display-name"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Display Name
            </label>
            <input
              id="join-display-name"
              type="text"
              autoFocus
              required
              maxLength={32}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Enter your name"
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorMessage ? 'join-name-error' : undefined}
              className={`w-full bg-slate-50 border rounded-xl px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:bg-white focus:outline-none transition-colors ${
                errorMessage
                  ? 'border-rose-400 focus:border-rose-600'
                  : 'border-slate-200 focus:border-slate-900'
              }`}
            />
            {errorMessage && (
              <p id="join-name-error" role="alert" className="mt-1.5 text-xs text-rose-600 font-medium">
                {errorMessage}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="join-room-slug"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Stream Room
            </label>
            <input
              id="join-room-slug"
              type="text"
              maxLength={48}
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder="main-stage"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-950 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 transition-colors"
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-slate-700">Join As</legend>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRoleInput('host')}
                aria-pressed={roleInput !== 'viewer'}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${
                  roleInput !== 'viewer'
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Video className="w-3.5 h-3.5" aria-hidden="true" />
                <span>On Stage</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleInput('viewer')}
                aria-pressed={roleInput === 'viewer'}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${
                  roleInput === 'viewer'
                    ? 'bg-slate-950 text-white border-slate-950'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Viewer</span>
              </button>
            </div>
          </fieldset>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <span>Join Stream</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {activeRooms.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-medium text-slate-500">Active rooms</p>
            <div className="flex flex-wrap gap-2">
              {activeRooms.slice(0, 4).map((r) => (
                <button
                  key={r.roomId}
                  type="button"
                  onClick={() => setRoomInput(r.roomId)}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                    sanitizeRoomSlug(roomInput) === r.roomId
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="font-medium">{r.title}</span>{' '}
                  <span className="opacity-70">
                    ({r.isLive ? 'Live · ' : ''}
                    {r.broadcasterCount} on stage)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
