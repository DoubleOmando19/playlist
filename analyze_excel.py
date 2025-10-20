import pandas as pd
import openpyxl
import json

# Load the Excel file to analyze its structure
excel_file = 'Almanique.xlsx'

# First, let's see what sheets are available
xl_file = pd.ExcelFile(excel_file)
print("Sheet names:")
print(xl_file.sheet_names)
print("\n" + "="*50 + "\n")

# Load each sheet and display its structure
for sheet_name in xl_file.sheet_names:
    print(f"Sheet: {sheet_name}")
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    print(f"Shape: {df.shape}")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst few rows:")
    print(df.head())
    print("\n" + "="*50 + "\n")
