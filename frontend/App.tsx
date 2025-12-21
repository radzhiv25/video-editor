import { StatusBar } from 'expo-status-bar';
import VideoEditor from './components/VideoEditor';

export default function App() {
  return (
    <>
      <VideoEditor />
      <StatusBar style="auto" />
    </>
  );
}
