import { createStream } from './createStream';
import { getStreamById } from './getStreamById';
import { updateStream } from './updateStream';
import { joinStream } from './joinStream';
import { leaveStream } from './leaveStream';
import { endStream } from './endStream';
import { searchStreams } from './searchStreams';
import { getTopStreams } from './getTopStreams';
import { getUserStreams } from './getUserStreams';
import { moderateStream } from './moderateStream';
import { reportStream } from './reportStream';
import { getStreamAnalytics } from './getStreamAnalytics';

export const LiveController = {
  createStream,
  getStreamById,
  updateStream,
  joinStream,
  leaveStream,
  endStream,
  searchStreams,
  getTopStreams,
  getUserStreams,
  moderateStream,
  reportStream,
  getStreamAnalytics,
};