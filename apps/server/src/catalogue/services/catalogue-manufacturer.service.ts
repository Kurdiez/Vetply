import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CatalogueManufacturerCreateBody,
  CatalogueManufacturerOption,
  CatalogueManufacturerUpdateBody,
} from '@vetply/shared';
import { Repository } from 'typeorm';
import { CatalogueManufacturerEntity } from '~/database/entities/catalogue/catalogue-manufacturer.entity';

@Injectable()
export class CatalogueManufacturerService {
  constructor(
    @InjectRepository(CatalogueManufacturerEntity)
    private readonly manufacturerRepository: Repository<CatalogueManufacturerEntity>,
  ) {}

  async list(): Promise<CatalogueManufacturerOption[]> {
    const rows = await this.manufacturerRepository.find({
      order: { name: 'ASC' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async create(
    body: CatalogueManufacturerCreateBody,
  ): Promise<CatalogueManufacturerOption> {
    const name = body.name.trim();
    await this.assertNameAvailable(name);
    const saved = await this.manufacturerRepository.save(
      this.manufacturerRepository.create({ name }),
    );
    return { id: saved.id, name: saved.name };
  }

  async update(
    id: string,
    body: CatalogueManufacturerUpdateBody,
  ): Promise<CatalogueManufacturerOption> {
    const row = await this.manufacturerRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    const name = body.name.trim();
    await this.assertNameAvailable(name, id);
    row.name = name;
    const saved = await this.manufacturerRepository.save(row);
    return { id: saved.id, name: saved.name };
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.manufacturerRepository.findOne({
      where: { name },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException({
        failReason: 'DUPLICATE_MANUFACTURER_NAME',
      });
    }
  }
}
