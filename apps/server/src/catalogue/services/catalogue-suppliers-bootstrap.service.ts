import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Supplier } from '@vetply/shared';
import { Repository } from 'typeorm';
import { CatalogueSupplierEntity } from '~/database/entities/catalogue/catalogue-supplier.entity';

@Injectable()
export class CatalogueSuppliersBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(CatalogueSuppliersBootstrapService.name);

  constructor(
    @InjectRepository(CatalogueSupplierEntity)
    private readonly supplierRepo: Repository<CatalogueSupplierEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSupplierRowsForEnum();
  }

  private async ensureSupplierRowsForEnum(): Promise<void> {
    const names = Object.values(Supplier) as Supplier[];
    let inserted = 0;
    for (const name of names) {
      const existing = await this.supplierRepo.findOne({ where: { name } });
      if (!existing) {
        await this.supplierRepo.save(this.supplierRepo.create({ name }));
        inserted += 1;
      }
    }
    if (inserted > 0) {
      this.logger.log(
        `Inserted ${inserted} catalogue supplier row(s) for new enum values.`,
      );
    }
  }
}
