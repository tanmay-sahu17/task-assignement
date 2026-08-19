import React, { useState } from 'react';
import { X } from 'lucide-react';
import useSpaces from '../../hooks/useSpaces';

export default function CreateSpaceModal({ isOpen, onClose, projectId }) {
  const { createSpace } = useSpaces();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createSpace({
        name,
        key: key.toUpperCase(),
        description,
        project: projectId
      });
      // Clear inputs
      setName('');
      setKey('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to create space.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="glass-modal w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Create New Space</h3>
          <button 
            onClick={() => {
              setError('');
              onClose();
            }} 
            className="text-gray-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {error && (
          <div className="p-3 bg-red-955/20 border border-red-900/50 text-red-400 text-xs rounded-xl">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) {
                  // Auto-generate key abbreviation from name
                  const words = e.target.value.trim().split(/\s+/);
                  const autoKey = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
                  setKey(autoKey);
                }
              }}
              placeholder="e.g. Documentation"
              className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Space Key (Abbreviation)</label>
            <input
              type="text"
              required
              maxLength={6}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. DOC"
              className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-[#71717a] uppercase mb-1.5">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the scope of this space..."
              className="w-full px-3 py-2 bg-[#131316] border border-[#202024] text-white rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#a1a1aa] hover:bg-[#121214] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow transition-colors cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Space'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
