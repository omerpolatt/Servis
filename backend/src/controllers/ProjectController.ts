import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'crypto';  // Benzersiz erişim anahtarı oluşturmak için
import User from '../models/Users';  // Kullanıcı modeli
import { Project } from '../models/Project';  // Bucket, artık Project oldu
import fs from 'fs-extra';
import path from 'path';

// Proje oluşturma fonksiyonu
export const createProject = async (req: Request, res: Response) => {
  const { projectName } = req.body;  // Project oluşturmak için projectName alıyoruz
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı
  
  if (!projectName || !token) {
    return res.status(400).json({ message: 'Project name ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };
    
    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Aynı kullanıcıya ait aynı isimde bir proje olup olmadığını kontrol et
    const existingProject = await Project.findOne({ projectName, owner: user._id });
    if (existingProject) {
      return res.status(400).json({ message: 'Bu isimde bir proje zaten mevcut.' });
    }

    // Güvenli bir proje adı oluştur (boşlukları ve özel karakterleri temizle)
    const sanitizedProjectName = projectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

    // Benzersiz bir access key oluştur
    const accessKey = crypto.randomBytes(16).toString('hex');  // Rastgele 16 baytlık bir anahtar

    // Proje için dosya sisteminde oluşturulacak yolu belirle
    const projectPath = path.join('/mnt/c/Users/avsro/Desktop/SPACES3', `${sanitizedProjectName}`);

    // Dosya sisteminde klasör oluştur
    await fs.ensureDir(projectPath);

    // Yeni proje oluştur
    const newProject = new Project({
      projectName: sanitizedProjectName,
      owner: user._id,
      accessKey: accessKey,  // Benzersiz access key
      path: projectPath,  // Proje için dosya yolu
    });
    await newProject.save();

    // Kullanıcının projelerine ekle
    user.projects.push({
      projectId: newProject._id as mongoose.Types.ObjectId,
      projectName: newProject.projectName
    });
    await user.save();

    return res.status(200).json({ message: 'Proje başarıyla oluşturuldu.', project: newProject });
  } catch (error) {
    if (typeof error === 'object' && (error as any).name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Geçersiz token.' });
    }

    console.error('Proje oluşturulurken hata:', error);
    return res.status(500).json({ message: 'Proje oluşturulurken bir hata oluştu.' });
  }
};

// Proje silme fonksiyonu
export const deleteProject = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı

  if (!projectId || !token) {
    return res.status(400).json({ message: 'Proje ID ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Silinmek istenen projeyi bul
    const project = await Project.findOne({ _id: projectId, owner: user._id });
    if (!project) {
      return res.status(404).json({ message: 'Proje bulunamadı ya da yetkiniz yok.' });
    }

    // Kullanıcının projeler listesinden bu projeyi çıkar
    user.projects = user.projects.filter(p => p.projectId.toString() !== projectId);
    await user.save();

    // Dosya sistemindeki proje yolunu sil
    const projectPath = project.path;
    if (fs.existsSync(projectPath)) {
      await fs.remove(projectPath);  // Dosya sisteminden klasörü sil
    }

    // Projeyi veritabanından sil
    await Project.findByIdAndDelete(projectId);  // remove() yerine findByIdAndDelete() kullanıyoruz

    return res.status(200).json({ message: 'Proje başarıyla silindi.' });
  } catch (error) {
    console.error('Proje silinirken hata oluştu:', error);
    return res.status(500).json({ message: 'Proje silinirken bir hata oluştu.' });
  }
};

// Proje adını güncelleme fonksiyonu
export const updateProjectName = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { newProjectName } = req.body;  // Yeni proje adı
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı

  if (!projectId || !newProjectName || !token) {
    return res.status(400).json({ message: 'Proje ID, yeni proje adı ve token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email });
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Mevcut projeyi bul
    const project = await Project.findOne({ _id: projectId, owner: user._id });
    if (!project) {
      return res.status(404).json({ message: 'Proje bulunamadı ya da yetkiniz yok.' });
    }

    // Eski proje yolunu al
    const oldProjectPath = project.path;

    // Yeni proje adını dosya sistemine uygun hale getir (boşlukları temizle)
    const sanitizedNewProjectName = newProjectName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

    // Yeni proje yolunu oluştur
    const newProjectPath = path.join(path.dirname(oldProjectPath), sanitizedNewProjectName);

    // Dosya sisteminde klasör adını değiştir
    if (fs.existsSync(oldProjectPath)) {
      await fs.rename(oldProjectPath, newProjectPath);  // Klasör adını değiştiriyoruz
    }

    // Veritabanında proje adını ve yolunu güncelle
    project.projectName = sanitizedNewProjectName;
    project.path = newProjectPath;
    await project.save();

    // Kullanıcıya ait projeler listesindeki proje adını da güncelle
    user.projects = user.projects.map(p => {
      if (p.projectId.toString() === projectId) {
        return { projectId: p.projectId, projectName: sanitizedNewProjectName };
      }
      return p;
    });
    await user.save();

    return res.status(200).json({ message: 'Proje adı başarıyla güncellendi.' });
  } catch (error) {
    console.error('Proje adı güncellenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Proje adı güncellenirken bir hata oluştu.' });
  }
};

// Kullanıcının projelerini listeleme fonksiyonu
export const listUserProjects = async (req: Request, res: Response) => {
  const token = req.header('Authorization')?.split(' ')[1];  // Kullanıcı token'ı

  if (!token) {
    return res.status(400).json({ message: 'Token gereklidir.' });
  }

  try {
    // Token'ı doğrula
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default_secret_key') as { email: string };

    // Kullanıcıyı bul
    const user = await User.findOne({ UserMail: decodedToken.email })
      .populate({
        path: 'projects.projectId',  // projectId alanını populate et
        model: 'Project',  // Project modelinden alıyoruz
        select: 'projectName _id'  // Sadece projectName ve _id alanlarını alıyoruz
      });

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Kullanıcının projeler alanını döndür
    const userProjects = user.projects.map((project: any) => ({
      projectId: project.projectId._id,
      projectName: project.projectId.projectName,
    }));

    return res.status(200).json({ projects: userProjects });
  } catch (error) {
    console.error('Kullanıcının projeleri listelenirken hata oluştu:', error);
    return res.status(500).json({ message: 'Projeler listelenirken bir hata oluştu.' });
  }
};

// Projeyi ID'ye göre getirme fonksiyonu
export const getProjectById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Veritabanında ID'ye göre projeyi bulun
    const project = await Project.findById(id);

    // Proje bulunamazsa 404 hatası döndür
    if (!project) {
      return res.status(404).json({ message: "Proje bulunamadı" });
    }

    // Projeyi döndür (accessKey dahil)
    res.json({ accessKey: project.accessKey });
  } catch (error) {
    console.error("Proje getirme hatası:", error);
    res.status(500).json({ message: "Sunucu hatası" });
  }
};
