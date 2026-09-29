import { Composition } from "remotion";
import { HestraShowcase } from "./showcase";
import { HestraJudgingVideo } from "./judging-video";

export const Root = () => <>
  <Composition id="HestraShowcase" component={HestraShowcase} durationInFrames={1800} fps={30} width={1920} height={1080}/>
  <Composition id="HestraJudgingVideo" component={HestraJudgingVideo} durationInFrames={4500} fps={30} width={1920} height={1080}/>
</>;
