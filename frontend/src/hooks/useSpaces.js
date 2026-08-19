import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { spaceAPI } from '../api/api';

export default function useSpaces() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useSpaces must be used within an AppProvider');
  }

  const createSpace = async ({ name, key, description, project }) => {
    const newSpace = await spaceAPI.create({ name, key, description, project });
    await context.fetchSpaces();
    return newSpace;
  };

  const updateSpace = async (spaceId, { name, key, description, project }) => {
    const updated = await spaceAPI.update(spaceId, { name, key, description, project });
    await context.fetchSpaces();
    return updated;
  };

  return {
    spaces: context.spaces,
    setSpaces: context.setSpaces,
    fetchSpaces: context.fetchSpaces,
    deleteSpace: context.deleteSpace,
    createSpace,
    updateSpace
  };
}
