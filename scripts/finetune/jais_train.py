#!/usr/bin/env python3
"""
Jais Fine-Tuning Script for Hassaniya Dialect
==============================================
Fine-tune Jais-30b or Jais-13b on Hassaniya dialect data using QLoRA.

Jais is specifically designed for Arabic and outperforms other models
on Arabic dialect tasks.

Usage:
    python3 jais_finetune.py --model jais-13b --epochs 3
    python3 jais_finetune.py --model jais-30b --epochs 3 --batch-size 1
"""

import os
import sys
import json
import argparse
from pathlib import Path

NORMALIZER_PATH = '/home/mohiy/hassania-dataset/models/hassaniya-normaliser/src'

# Patch transformers.modeling_utils.dispatch_model — the local binding used at call site.
# transformers does  (line 111 of modeling_utils.py),
# so we must replace the name in that module's namespace, not in accelerate itself.
import transformers.modeling_utils as _t_mu
_orig_dispatch_model = _t_mu.dispatch_model
def _patched_dispatch_model(model, device_map, **kwargs):
    if len(set(device_map.values())) == 1 and (
        getattr(model, 'is_loaded_in_4bit', False) or
        getattr(model, 'is_loaded_in_8bit', False)
    ):
        model.hf_device_map = dict(device_map)
        return model
    return _orig_dispatch_model(model, device_map=device_map, **kwargs)
_t_mu.dispatch_model = _patched_dispatch_model
try:
    import sys as _sys
    _sys.path.insert(0, NORMALIZER_PATH)
    from hassy_normalizer.normalizer import normalize_text as _normalize_text
    _normalize = _normalize_text
    print('hassy_normalizer loaded')
except Exception:
    _normalize = lambda t: t

def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune Jais on Hassaniya data")
    parser.add_argument("--model", type=str, default="jais-13b",
                        choices=["jais-13b", "jais-30b"],
                        help="Jais model size (default: jais-13b)")
    parser.add_argument("--epochs", type=int, default=3,
                        help="Number of training epochs (default: 3)")
    parser.add_argument("--batch-size", type=int, default=2,
                        help="Training batch size (default: 2)")
    parser.add_argument("--lr", type=float, default=2e-5,
                        help="Learning rate (default: 2e-5)")
    parser.add_argument("--lora-r", type=int, default=16,
                        help="LoRA rank (default: 16)")
    parser.add_argument("--lora-alpha", type=int, default=32,
                        help="LoRA alpha (default: 32)")
    parser.add_argument("--max-length", type=int, default=1024,
                        help="Maximum sequence length (default: 1024)")
    parser.add_argument("--output-dir", type=str, default="models/jais-hassaniya",
                        help="Output directory for the model")
    parser.add_argument("--data-dir", type=str, 
                        default="/home/mohiy/hassania-dataset",
                        help="Directory containing training data")
    return parser.parse_args()


# Model configurations
MODEL_CONFIGS = {
    "jais-13b": {
        "model_id": "/home/mohiy/hassania-dataset/models/jais-13b",
        "vram_required": "~10GB with QLoRA",
        "recommended_batch": 2,
    },
    "jais-30b": {
        "model_id": "core42/jais-30b-chat-v3",
        "vram_required": "~24GB with QLoRA",
        "recommended_batch": 1,
    }
}

# Jais prompt templates
JAIS_SYSTEM_PROMPT_AR = """اسمك مساعد حسانية، متخصص في اللهجة الحسانية الموريتانية. أنت تتحدث الحسانية بطلاقة وتفهم الثقافة الموريتانية. ساعد المستخدمين في تعلم وفهم اللهجة الحسانية."""

JAIS_SYSTEM_PROMPT_EN = """You are a Hassaniya assistant, specialized in the Mauritanian Hassaniya dialect. You speak Hassaniya fluently and understand Mauritanian culture. Help users learn and understand the Hassaniya dialect."""


def format_jais_prompt(user_message: str, assistant_response: str = None, language: str = "ar") -> str:
    """Format a conversation in Jais prompt format."""
    system_prompt = JAIS_SYSTEM_PROMPT_AR if language == "ar" else JAIS_SYSTEM_PROMPT_EN
    
    prompt = f"### Instruction: {system_prompt}\n\n"
    prompt += f"أكمل المحادثة أدناه بين [|Human|] و [|AI|]:\n"
    prompt += f"### Input: [|Human|] {user_message}\n"
    prompt += f"### Response: [|AI|]"
    
    if assistant_response:
        prompt += f" {assistant_response}"
    
    return prompt


def convert_to_jais_format(input_file: str, output_file: str):
    """Convert HDRP SFT data to Jais training format."""
    print(f"Converting {input_file} to Jais format...")
    
    converted = []
    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line.strip())
                messages = data.get('messages', [])
                
                # Extract user and assistant messages
                user_msg = ""
                assistant_msg = ""
                
                for msg in messages:
                    if msg['role'] == 'user':
                        user_msg = msg['content']
                    elif msg['role'] == 'assistant':
                        assistant_msg = msg['content']
                
                if user_msg and assistant_msg:
                    user_msg = _normalize(user_msg)
                    assistant_msg = _normalize(assistant_msg)
                    jais_prompt = format_jais_prompt(user_msg, assistant_msg)
                    converted.append({"text": jais_prompt})
                    
            except json.JSONDecodeError:
                continue
    
    # Write converted data
    with open(output_file, 'w', encoding='utf-8') as f:
        for item in converted:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    print(f"Converted {len(converted)} examples to {output_file}")
    return len(converted)


def main():
    args = parse_args()
    
    print("="*60)
    print("JAIS FINE-TUNING FOR HASSANIYA DIALECT")
    print("="*60)
    
    config = MODEL_CONFIGS[args.model]
    print(f"\nModel: {config['model_id']}")
    print(f"VRAM Required: {config['vram_required']}")
    print(f"Epochs: {args.epochs}")
    print(f"Batch Size: {args.batch_size}")
    print(f"Learning Rate: {args.lr}")
    print(f"LoRA Rank: {args.lora_r}")
    print(f"LoRA Alpha: {args.lora_alpha}")
    
    # Check for required packages
    try:
        import torch
        import transformers
        from transformers import (
            AutoTokenizer, 
            AutoModelForCausalLM,
            TrainingArguments,
            Trainer,
            DataCollatorForLanguageModeling,
            BitsAndBytesConfig
        )
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
        from datasets import load_dataset
    except ImportError as e:
        print(f"\nMissing required package: {e}")
        print("\nInstall requirements with:")
        print("  pip install -r requirements_jais.txt")
        sys.exit(1)
    
    # Check CUDA availability
    if not torch.cuda.is_available():
        print("\nWARNING: CUDA not available. Training will be very slow on CPU.")
        print("Consider using a GPU-enabled environment.")
    else:
        print(f"\nCUDA available: {torch.cuda.get_device_name(0)}")
        print(f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
    
    # Prepare data
    script_dir = Path(__file__).parent.parent.parent.parent
    data_dir = Path(args.data_dir)
    
    # Find training data
    train_file = data_dir / "jais_train_final.jsonl"
    if not train_file.exists():
        print(f"\nError: Training data not found at {train_file}")
        sys.exit(1)
    
    # Dataset already formatted as Jais text field — use directly
    jais_train_file = train_file
    num_examples = sum(1 for _ in open(str(train_file)))
    print(f"Using pre-formatted dataset: {num_examples} examples")
    
    print(f"\nLoading model: {config['model_id']}")
    print("This may take several minutes...")
    
    # QLoRA configuration
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    
    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        config['model_id'],
        trust_remote_code=True
    )
    
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    # Load model with quantization
    model = AutoModelForCausalLM.from_pretrained(
        config['model_id'],
        quantization_config=bnb_config,
        device_map={"":0},
        trust_remote_code=True,
    )
    
    # Prepare model for k-bit training
    model = prepare_model_for_kbit_training(model)
    
    # LoRA configuration
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", 
                       "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )
    
    # Apply LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    
    # Load dataset
    dataset = load_dataset('json', data_files=str(jais_train_file), split='train')
    
    # Tokenize function
    def tokenize_function(examples):
        return tokenizer(
            examples['text'],
            truncation=True,
            max_length=args.max_length,
            padding='max_length',
        )
    
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset.column_names,
    )
    
    # Split into train/eval
    split_dataset = tokenized_dataset.train_test_split(test_size=0.05, seed=42)
    
    # Training arguments
    output_dir = script_dir / args.output_dir
    training_args = TrainingArguments(
        output_dir=str(output_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        learning_rate=args.lr,
        weight_decay=0.01,
        warmup_ratio=0.1,
        lr_scheduler_type="cosine",
        logging_steps=10,
        save_strategy="epoch",
        evaluation_strategy="epoch",
        fp16=True,
        optim="paged_adamw_8bit",
        report_to="none",
        save_total_limit=2,
    )
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,
    )
    
    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=split_dataset['train'],
        eval_dataset=split_dataset['test'],
        data_collator=data_collator,
    )
    
    print("\n" + "="*60)
    print("STARTING TRAINING")
    print("="*60)
    
    # Train
    trainer.train()
    
    # Save final model
    final_output = output_dir / "final"
    trainer.save_model(str(final_output))
    tokenizer.save_pretrained(str(final_output))
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE")
    print("="*60)
    print(f"\nModel saved to: {final_output}")
    print("\nTo test the model:")
    print(f"  python3 test_jais_hassaniya.py --model {final_output}")


if __name__ == "__main__":
    main()
