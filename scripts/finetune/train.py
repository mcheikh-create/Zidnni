#!/usr/bin/env python3
"""
Qwen Fine-Tuning Script for Hassaniya
Uses QLoRA (Quantized Low-Rank Adaptation) for efficient fine-tuning.

Requirements:
    pip install torch transformers peft bitsandbytes accelerate datasets trl

Hardware Requirements:
    - Qwen2.5-0.5B: 4GB VRAM
    - Qwen2.5-1.5B: 8GB VRAM
    - Qwen2.5-7B: 16GB VRAM
    - Qwen2.5-14B: 24GB+ VRAM
"""

import json
import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# Check for required packages
try:
    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        BitsAndBytesConfig,
    )
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import Dataset
    from trl import SFTTrainer, SFTConfig
    PACKAGES_AVAILABLE = True
except ImportError as e:
    PACKAGES_AVAILABLE = False
    MISSING_PACKAGE = str(e)

# Paths
BASE_DIR = Path(__file__).parent.parent.parent.parent
SFT_FILE = Path("/home/mohiy/hassania-dataset/final_unified_train.jsonl")
EVAL_FILE = Path("/home/mohiy/hassania-dataset/final_unified_val.jsonl")
OUTPUT_DIR = BASE_DIR / "models/qwen-hassaniya"

@dataclass
class ModelConfig:
    """Model configuration for fine-tuning."""
    model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"
    max_seq_length: int = 2048
    load_in_4bit: bool = True
    bnb_4bit_compute_dtype: str = "float16"
    bnb_4bit_quant_type: str = "nf4"
    use_nested_quant: bool = False

@dataclass
class LoRAConfig:
    """LoRA configuration."""
    r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    target_modules: list = field(default_factory=lambda: [
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ])
    bias: str = "none"
    task_type: str = "CAUSAL_LM"

@dataclass
class TrainConfig:
    """Training configuration."""
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 4
    per_device_eval_batch_size: int = 4
    gradient_accumulation_steps: int = 4
    learning_rate: float = 2e-5
    weight_decay: float = 0.01
    warmup_ratio: float = 0.03
    lr_scheduler_type: str = "cosine"
    logging_steps: int = 10
    save_steps: int = 100
    eval_steps: int = 100
    save_total_limit: int = 3
    fp16: bool = False
    bf16: bool = True  # RTX 5080 (Blackwell sm_120) — bf16 is native
    gradient_checkpointing: bool = True
    optim: str = "paged_adamw_32bit"

def load_dataset(file_path: Path) -> Dataset:
    """Load HDRP SFT data and convert to Hugging Face Dataset."""
    data = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                record = json.loads(line)
                messages = record.get("messages", [])
                
                # Convert to chat format string
                text = ""
                for msg in messages:
                    role = msg.get("role", "")
                    content = msg.get("content", "")
                    
                    if role == "system":
                        text += f"<|im_start|>system\n{content}<|im_end|>\n"
                    elif role == "user":
                        text += f"<|im_start|>user\n{content}<|im_end|>\n"
                    elif role == "assistant":
                        text += f"<|im_start|>assistant\n{content}<|im_end|>\n"
                
                if text:
                    data.append({"text": text})
            except:
                pass
    
    return Dataset.from_list(data)

def create_model_and_tokenizer(config: ModelConfig):
    """Create model and tokenizer with quantization."""
    
    # Quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=config.load_in_4bit,
        bnb_4bit_compute_dtype=getattr(torch, config.bnb_4bit_compute_dtype),
        bnb_4bit_quant_type=config.bnb_4bit_quant_type,
        bnb_4bit_use_double_quant=config.use_nested_quant,
    )
    
    # Load model
    model = AutoModelForCausalLM.from_pretrained(
        config.model_name,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        config.model_name,
        trust_remote_code=True,
    )
    
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    return model, tokenizer

def create_peft_model(model, lora_config: LoRAConfig):
    """Apply LoRA to model."""
    
    # Prepare model for k-bit training
    model = prepare_model_for_kbit_training(model)
    
    # Create LoRA config
    peft_config = LoraConfig(
        r=lora_config.r,
        lora_alpha=lora_config.lora_alpha,
        lora_dropout=lora_config.lora_dropout,
        target_modules=lora_config.target_modules,
        bias=lora_config.bias,
        task_type=lora_config.task_type,
    )
    
    # Apply LoRA
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()
    
    return model

def train(
    model_config: ModelConfig = None,
    lora_config: LoRAConfig = None,
    train_config: TrainConfig = None,
    resume_from_checkpoint: Optional[str] = None,
):
    """Run fine-tuning."""
    
    if not PACKAGES_AVAILABLE:
        print(f"Error: Missing required packages: {MISSING_PACKAGE}")
        print("\nInstall with:")
        print("  pip install torch transformers peft bitsandbytes accelerate datasets trl")
        return
    
    # Use defaults if not provided
    model_config = model_config or ModelConfig()
    lora_config = lora_config or LoRAConfig()
    train_config = train_config or TrainConfig()
    
    print("="*60)
    print("QWEN FINE-TUNING FOR HASSANIYA")
    print("="*60)
    
    # Load datasets
    print("\n[1] Loading datasets...")
    train_dataset = load_dataset(SFT_FILE)
    eval_dataset = load_dataset(EVAL_FILE)
    print(f"    Training: {len(train_dataset)} samples")
    print(f"    Evaluation: {len(eval_dataset)} samples")
    
    # Create model and tokenizer
    print(f"\n[2] Loading model: {model_config.model_name}...")
    model, tokenizer = create_model_and_tokenizer(model_config)
    
    # Apply LoRA
    print("\n[3] Applying LoRA...")
    model = create_peft_model(model, lora_config)
    
    # Training arguments
    print("\n[4] Setting up training...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    training_args = SFTConfig(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=train_config.num_train_epochs,
        per_device_train_batch_size=train_config.per_device_train_batch_size,
        per_device_eval_batch_size=train_config.per_device_eval_batch_size,
        gradient_accumulation_steps=train_config.gradient_accumulation_steps,
        learning_rate=train_config.learning_rate,
        weight_decay=train_config.weight_decay,
        warmup_ratio=train_config.warmup_ratio,
        lr_scheduler_type=train_config.lr_scheduler_type,
        logging_steps=train_config.logging_steps,
        save_steps=train_config.save_steps,
        eval_steps=train_config.eval_steps,
        eval_strategy="steps",
        save_total_limit=train_config.save_total_limit,
        fp16=train_config.fp16,
        bf16=train_config.bf16,
        gradient_checkpointing=train_config.gradient_checkpointing,
        optim=train_config.optim,
        report_to="none",
        load_best_model_at_end=True,
        dataset_text_field="text",
        max_length=model_config.max_seq_length,
    )

    # Create trainer
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        processing_class=tokenizer,
    )
    
    # Train
    print("\n[5] Starting training...")
    print(f"    Epochs: {train_config.num_train_epochs}")
    print(f"    Batch size: {train_config.per_device_train_batch_size}")
    print(f"    Learning rate: {train_config.learning_rate}")
    print(f"    Output: {OUTPUT_DIR}")
    
    if resume_from_checkpoint:
        print(f"    Resuming from: {resume_from_checkpoint}")
    trainer.train(resume_from_checkpoint=resume_from_checkpoint)
    
    # Save final model
    print("\n[6] Saving model...")
    trainer.save_model(str(OUTPUT_DIR / "final"))
    tokenizer.save_pretrained(str(OUTPUT_DIR / "final"))
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"\nModel saved to: {OUTPUT_DIR / 'final'}")
    print("\nTo use the model:")
    print(f"  from transformers import AutoModelForCausalLM, AutoTokenizer")
    print(f"  model = AutoModelForCausalLM.from_pretrained('{OUTPUT_DIR / 'final'}')")
    print(f"  tokenizer = AutoTokenizer.from_pretrained('{OUTPUT_DIR / 'final'}')")

def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Fine-tune Qwen on Hassaniya")
    parser.add_argument("--model", default="Qwen/Qwen2.5-1.5B-Instruct", help="Model name")
    parser.add_argument("--epochs", type=int, default=3, help="Number of epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    parser.add_argument("--lora-r", type=int, default=16, help="LoRA rank")
    parser.add_argument("--lora-alpha", type=int, default=32, help="LoRA alpha")
    parser.add_argument("--resume-from-checkpoint", type=str, default=None, help="Path to checkpoint to resume from")

    args = parser.parse_args()

    model_config = ModelConfig(model_name=args.model)
    lora_config = LoRAConfig(r=args.lora_r, lora_alpha=args.lora_alpha)
    train_config = TrainConfig(
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        learning_rate=args.lr,
    )

    train(model_config, lora_config, train_config, resume_from_checkpoint=args.resume_from_checkpoint)

if __name__ == "__main__":
    main()
