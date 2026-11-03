"""Check that ctranslate2 sees CUDA via the pip NVIDIA wheels."""
import os, sys, site
for sp in site.getsitepackages():
    for sub in ("cublas", "cudnn", "cuda_nvrtc"):
        d = os.path.join(sp, "nvidia", sub, "bin")
        if os.path.isdir(d):
            os.add_dll_directory(d); os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]
import ctranslate2
print("ct2", ctranslate2.__version__, "cuda devices:", ctranslate2.get_cuda_device_count())
print("compute types:", ctranslate2.get_supported_compute_types("cuda"))
