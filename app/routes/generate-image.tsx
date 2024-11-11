import type { FC, ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { json } from "@remix-run/cloudflare";
import { useActionData, Form, useNavigation, useLoaderData } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/cloudflare";
import { createAppContext } from "../context";

export const loader: LoaderFunction = async ({ context }) => {
  const appContext = createAppContext(context);
  const { config } = appContext;
  const models = Object.entries(config.CUSTOMER_MODEL_MAP).map(([id, path]) => ({ id, path }));
  return json({ models, config });
};

export const action: ActionFunction = async ({ request, context }: { request: Request; context: any }) => {
  const appContext = createAppContext(context);
  const { imageGenerationService, config } = appContext;

  console.log("Generate image action started");
  console.log("Config:", JSON.stringify(config, null, 2));

  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const enhance = formData.get("enhance") === "true";
  const modelId = formData.get("model") as string;
  const size = formData.get("size") as string;
  const numSteps = parseInt(formData.get("numSteps") as string, 10);

  console.log("Form data:", { prompt, enhance, modelId, size, numSteps });

  if (!prompt) {
    return json({ error: "未找到提示词" }, { status: 400 });
  }

  const model = config.CUSTOMER_MODEL_MAP[modelId];
  if (!model) {
    return json({ error: "无效的模型" }, { status: 400 });
  }

  try {
    const result = await imageGenerationService.generateImage(
      enhance ? `---tl ${prompt}` : prompt,
      model,
      size,
      numSteps
    );
    console.log("Image generation successful");
    return json(result);
  } catch (error) {
    console.error("生成图片时出错:", error);
    if (error instanceof AppError) {
      return json({ error: `生成图片失败: ${error.message}` }, { status: error.status || 500 });
    }
    return json({ error: "生成图片失败: 未知错误" }, { status: 500 });
  }
};

const GenerateImage: FC = () => {
  const { models, config } = useLoaderData<typeof loader>();
  const [prompt, setPrompt] = useState("");
  const [enhance, setEnhance] = useState(false);
  const [model, setModel] = useState(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
  const [size, setSize] = useState("1024x1024");
  const [numSteps, setNumSteps] = useState(config.FLUX_NUM_STEPS);
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const isSubmitting = navigation.state === "submitting";

  const handleEnhanceToggle = () => {
    setEnhance(!enhance);
  };

  const handleReset = () => {
    setPrompt("");
    setEnhance(false);
    setModel(config.CUSTOMER_MODEL_MAP["FLUX.1-Schnell-CF"]);
    setSize("1024x1024");
    setNumSteps(config.FLUX_NUM_STEPS);
  };

  const handlePromptChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isSubmitting) {
      e.preventDefault();
    }
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  };

  return (
   <div className="min-h-screen flex items-center justify-center bg-white px-4">
  <div className="relative bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-2xl p-10 max-w-md w-full">
    <h1 className="text-4xl font-extrabold text-black mb-8 text-center drop-shadow-lg">
          CloudFlare Wokers AI Image Creat
        </h1>
        <Form method="post" className="space-y-8" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="prompt" className="block text-black text-lg font-semibold mb-3">
              输入提示词：
            </label>
            <input
              type="text"
              id="prompt"
              name="prompt"
              value={prompt}
              onChange={handlePromptChange}
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-black placeholder-white placeholder-opacity-70 transition duration-300 ease-in-out hover:bg-opacity-30"
              placeholder="请输入您的提示词..."
              required
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-black text-lg font-semibold mb-3">
              选择模型：
            </label>
            <select
              id="model"
              name="model"
              value={model}
              onChange={handleModelChange}
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-black transition duration-300 ease-in-out hover:bg-opacity-30"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="size" className="block text-black text-lg font-semibold mb-3">
              图片尺寸：
            </label>
            <select
              id="size"
              name="size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-black
              transition duration-300 ease-in-out hover:bg-opacity-30"
            >
              <option value="512x512">512x512</option>
              <option value="768x768">768x768</option>
              <option value="1024x1024">1024x1024</option>
            </select>
          </div>
          <div>
            <label htmlFor="numSteps" className="block text-black text-lg font-semibold mb-3">
              生成步数：
            </label>
            <input
              type="number"
              id="numSteps"
              name="numSteps"
              value={numSteps}
              onChange={(e) => setNumSteps(parseInt(e.target.value, 10))}
              min="4"
              max="8"
              className="w-full px-5 py-3 rounded-xl border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white bg-opacity-20 text-black transition duration-300 ease-in-out hover:bg-opacity-30"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0">
            <button
              type="button"
              onClick={handleEnhanceToggle}
             className={`flex-1 px-1 py-3 rounded-xl text-lg font-semibold transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400
  ${enhance ? "bg-transparent text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-400" : "bg-transparent text-black"}`}
  disabled={isSubmitting}
  onClick={() => {
    // Add this function to handle the gradient change on click
    enhance = true;
  }}
  style={{
    background: "transparent",
    border: "none"
  }}
            >
              {enhance ? "已强化提示词" : "强化提示词"}
            </button>
            <input type="hidden" name="enhance" value={enhance.toString()} />
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-1 py-3 rounded-xl text-lg font-semibold text-black bg-transparent border-3 border-black transition transform hover:scale-105 focus:outline-none focus:ring-2"
disabled={isSubmitting}
            >
              重置
            </button>
            <button
              type="submit"
              className={`flex-1 px-1 py-3 rounded-xl text-lg font-semibold text-transparent transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black
  ${isSubmitting ? "cursor-not-allowed" : ""}`}
  style={{ 
    backgroundImage: 'linear-gradient(90deg, #E1BEE7, #FFC1E3)', 
    width: 'auto', 
    minWidth: '120px', 
    wordWrap: 'break-word' 
  }} 
  disabled={isSubmitting}
>
  {isSubmitting ? "少女祈祷中..." : "提交"}
            </button>
          </div>
        </Form>
        {actionData && actionData.image && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-black mb-4">介个是你的照片哦：</h2>
            <img src={`data:image/jpeg;base64,${actionData.image}`} alt="Generated Image" className="w-full rounded-xl shadow-lg" />
          </div>
        )}
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000 -z-10"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000 -z-10"></div>
      </div>
    </div>
  );
};

export default GenerateImage;
