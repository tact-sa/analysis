# analysis

مشروع تحليل بيانات لشركة TACT.

## الهيكل

```
analysis/
├── data/
│   ├── raw/          # البيانات الخام (غير متتبعة في git)
│   └── processed/    # البيانات بعد المعالجة (غير متتبعة في git)
├── notebooks/        # دفاتر Jupyter للاستكشاف
├── src/analysis/     # الكود القابل لإعادة الاستخدام
└── tests/            # الاختبارات
```

## البدء

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e .
pytest
```
