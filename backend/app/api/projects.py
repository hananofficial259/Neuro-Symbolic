from typing import List
from fastapi import APIRouter, HTTPException, status

from backend.app.db.database import DatabaseRepository
from backend.app.schemas.project import ProjectCreate, ProjectResponse

router = APIRouter(prefix="/projects", tags=["Projects"])

DEFAULT_USER_ID = "usr_foundry_admin"


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate):
    proj = DatabaseRepository.create_project(
        user_id=DEFAULT_USER_ID,
        name=payload.name,
        description=payload.description,
    )
    return proj


@router.get("", response_model=List[ProjectResponse])
async def list_projects():
    return DatabaseRepository.list_projects(DEFAULT_USER_ID)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    proj = DatabaseRepository.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str):
    proj = DatabaseRepository.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    DatabaseRepository.delete_project(project_id)
