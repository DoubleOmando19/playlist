import pandas as pd
import json
import os
import re

# Load the Excel file
excel_file = 'Almanique.xlsx'
df = pd.read_excel(excel_file, sheet_name='Sheet1')

# Display full data to understand the duplicate POPULATION columns
print("Column names:")
print(df.columns.tolist())
print("\nData info:")
print(df.info())
print("\nSample data with all columns:")
print(df.head(10).to_string())

# Check for any null values
print("\n\nNull values per column:")
print(df.isnull().sum())
