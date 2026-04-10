from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, Float, Boolean, String
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

load_dotenv()

#-----------------------------------------------------------
# 1- DB Render | 2- Conectar DB | 3- Acesso Front
#-----------------------------------------------------------

#1- DB Render
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://adm:0Boes78AwGdd8uizeMxRe9mRT4MssKcb@dpg-d7c0ohnlk1mc7399mmm0-a.oregon-postgres.render.com/cashback_t3s5"
)
#2- Conectar DB
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

app = FastAPI()
#Acesso Front
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#-----------------------------------------------------------
# 1- Tabela | 2- Criar Tabela | 3- Tipo Entrada 4- Regra
#-----------------------------------------------------------

#1- Tabela
class Consulta(Base):
    __tablename__ = "consultas"

    id       = Column(Integer, primary_key=True, index=True)
    ip       = Column(String)
    valor    = Column(Float)
    desconto = Column(Float)
    vip      = Column(Boolean)
    cashback = Column(Float)
#2- Criar Tabela
Base.metadata.create_all(bind=engine)
#3- Tipo Entrada
class CashbackRequest(BaseModel):
    valor:    float
    desconto: float
    vip:      bool
#4- Regra
def calcular_cashback(valor, desconto, vip):
    valor_final = valor * (1 - desconto / 100)
    cashback = valor_final * 0.05
    if valor_final > 500:
        cashback *= 2
    if vip:
        cashback += cashback * 0.10
    return round(cashback, 2)

#-----------------------------------------------------------
# 1- Ini | 2- Calcular e salvar | 3- Histórico IP
#-----------------------------------------------------------

#1- Ini
from fastapi.responses import FileResponse

@app.get("/")
def home():
    return FileResponse("frontend/index.html")
#2- Calcular e salvar
@app.post("/cashback")
async def cashback(data: CashbackRequest, request: Request):
    db = SessionLocal()
    resultado = calcular_cashback(data.valor, data.desconto, data.vip)
    ip = request.client.host
    consulta = Consulta(
        ip=ip,
        valor=data.valor,
        desconto=data.desconto,
        vip=data.vip,
        cashback=resultado
    )
    db.add(consulta)
    db.commit()
    db.close()
    return {"cashback": resultado}
#3- Histórico IP
@app.get("/historico")
def historico(request: Request):
    db = SessionLocal()
    ip = request.client.host
    consultas = db.query(Consulta).filter(Consulta.ip == ip).all()
    db.close()
    return [
        {
            "valor":    c.valor,
            "desconto": c.desconto,
            "vip":      c.vip,
            "cashback": c.cashback
        }
        for c in consultas
    ]