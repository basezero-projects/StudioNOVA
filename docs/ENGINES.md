# StudioNOVA · Engine Integration Guide (v0.01)

---

## 1. ComfyUI (Generation Engine)

**Repo:** `external/comfyui`  
**Type:** REST API + Node graph workflows  

### Default Ports
- Web UI / API: `8188`

### Primary Use
- Text→Image and Image→Video generation  
- Node-based upscaling (Real-ESRGAN, SD x4)  
- AnimateDiff / CogVideoX support

### Integration Method
Worker service calls:
```python
requests.post("http://localhost:8188/api/prompt", json=payload)
Payload includes:

Base model path

LoRA file path

Prompt / Negative prompt

CFG, steps, seed

Optional: upscaler node

2. kohya_ss (Training Engine)
Repo: external/kohya_ss
Type: CLI + Python scripts
Entry: train_network.py

Usage Example
bash
Copy code
python train_network.py \
  --pretrained_model_name_or_path="/models/sdxl_base.safetensors" \
  --train_data_dir="/datasets/char001" \
  --output_dir="/models/lora_char001" \
  --network_dim=16 \
  --max_train_steps=3000
Integration Method
Worker executes as a subprocess:

python
Copy code
subprocess.run(["python", "train_network.py", *args], cwd="external/kohya_ss")
Then logs:

Training progress stdout

Generated .safetensors path

Final status → database

3. Upscaling Engines
Bundled in ComfyUI:

Real-ESRGAN (2× / 4×)

SD x4 Upscaler

4x UltraSharp (optional)

Worker includes parameter upscale=True to trigger an upscaling node in ComfyUI workflow.

4. Worker Configuration (planned)
Variable	Example	Description
COMFYUI_API_URL	http://localhost:8188	Engine endpoint
KOHYA_PATH	external/kohya_ss	CLI execution root
OUTPUT_DIR	storage/results	Where media is saved
UPSCALER	realesrgan	Default upscaler

5. Future Engine Candidates
CogVideoX (img→video)

InvokeAI Flux (alt generation engine)

DreamGaussian / TripoSR (for 3D assets)

End of file.