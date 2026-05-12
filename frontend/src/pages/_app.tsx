import "@/styles/hello.css";
import "@/styles/base.css";
import "@/styles/main.css";
import "@/styles/choose.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
